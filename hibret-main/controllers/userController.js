import UserModel from "../models/users.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";
import Workflow from "../models/workflow.model.js";
import { selectSingleUser } from "../services/workflowService.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import * as EmailService from "../services/emailService.js";
import * as UserService from "../services/userService.js";
import otpGenerator from "otp-generator";
import RoleModel from '../models/role.model.js';
import e from "express";

const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // OTP expiration time in milliseconds (e.g., 5 minutes)

// Admin role ID for comparison
const ADMIN_ROLE_ID = new mongoose.Types.ObjectId("66374bd0fdfae8633a05d11e");


// POST: http://localhost:5000/api/admin/user/create
export async function createAccounts(req, res) {
  try {
    const users = await UserService.getUser();

    if (users.error) {
      // Handle the error from getUser
      return res.status(500).json({ message: users.error });
    }

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "Please provide users data." });
    }

    const createdUsers = [];
    const updatedUsers = [];
    const deletedUsers = [];

    for (const user of users) {
      try {
        const existingUser = await UserModel.findOne({ email: user.email });

        if (existingUser) {
          // User exists, check for changes
          if (existingUser.role_id.toString() !== user.role_id.toString()) {
            // Update user information
            await UserModel.updateOne(
              { email: user.email },
              { $set: { role_id: new mongoose.Types.ObjectId(user.role_id) } }
            );
            updatedUsers.push(user.email);
          }
        } else {
          // User doesn't exist, create new user
          const result = await UserService.createUser(user);
          if (!result.error) {
            createdUsers.push(user.email);
          } else {
            console.error(`Error creating user: ${user.email}`, result.error);
          }
        }
      } catch (error) {
        console.error(`Error processing user: ${user.email}`, error);
      }
    }

    // Deletion logic
    try {
      const allHRUsers = users.map((user) => user.email);
      const usersToDelete = await UserModel.find({
        email: { $nin: allHRUsers },
      });
      for (const userToDelete of usersToDelete) {
        try {
          const { _id, role_id } = userToDelete;

          const userWorkflows = await UserWorkflow.findOne({ _id });
          if (userWorkflows) {
            for (const workflow of userWorkflows.workflows) {
              const newUserId = await selectSingleUser(role_id);

              await UserWorkflow.findOneAndUpdate(
                { userId: newUserId },
                {
                  $push: {
                    workflows: {
                      workflowId: workflow.workflowId,
                      isActive: workflow.isActive,
                    },
                  },
                },
                { upsert: true }
              );

              await Workflow.updateOne(
                { _id: workflow.workflowId, "assignedUsers.user": _id },
                { $set: { "assignedUsers.$.user": newUserId } }
              );
            }
          }

          await UserModel.deleteOne({ email: userToDelete.email });
          deletedUsers.push(userToDelete.email);
        } catch (error) {
          console.error(`Error deleting user: ${userToDelete.email}`, error);
        }
      }
    } catch (error) {
      console.error("Error deleting users:", error);
    }

    return {
      message: "Users synchronization completed successfully",
      createdUsers,
      updatedUsers,
      deletedUsers,
    };
  } catch (error) {
    console.error("Error synchronizing users:", error);
    return { message: "Internal server error" };
  }
}

// Endpoint to get all users in the database
export async function getAllUsers(req, res) {
  try {
     // Fetch all users
     const users = await UserModel.find({}).populate('role_id', 'roleName');
    console.log(users)
     if (!users || users.length === 0) {
       return res.status(404).json({ message: "No users found" });
     }
 

     let sanitizedUsers = users.map(user => ({
       userId: user._id,
       username: user.username,
       email: user.email,
       role_id: user.role_id._id,
       roleName: user.role_id.roleName,
       status: user.status,
       activationStatus:user.activationStatus,
       accountCreationStatus:user.accountCreationStatus,
     }));
 
     sanitizedUsers = sanitizedUsers.filter(user => !user.role_id.equals(ADMIN_ROLE_ID));
    return res.status(200).json({ users: sanitizedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST: http://localhost:5000/api/generateOTP */
let OTP_STATE = {};
let EMAIL="";
export async function generateOTP(req, res) {
  console.log('generateOTP function called');

  const { email } = req.body;
  const user = await UserModel.findOne({ email });
  EMAIL= user.email;
  console.log('Current OTP state:', OTP_STATE);

  // Check if an OTP has been generated recently
  if (OTP_STATE.code && OTP_STATE.timestamp) {
    const currentTime = Date.now();
    const timeSinceLastOTP = currentTime - OTP_STATE.timestamp;

    console.log(`Current time: ${currentTime}`);
    console.log(`Last OTP timestamp: ${OTP_STATE.timestamp}`);
    console.log(`Time since last OTP: ${timeSinceLastOTP}ms`);

    if (timeSinceLastOTP < OTP_EXPIRATION_TIME) {
      const timeRemaining = Math.ceil((OTP_EXPIRATION_TIME - timeSinceLastOTP) / 1000);
      console.log(`Please wait ${timeRemaining} seconds before requesting a new OTP`);
      return res.status(429).json({ message: `Please wait ${timeRemaining} seconds before requesting a new OTP` });
    }
  }

  const otp = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  // Store the OTP and the timestamp
  OTP_STATE = { code: otp, timestamp: Date.now() };

  console.log(`Generated OTP: ${otp}`);
  console.log(`OTP timestamp: ${OTP_STATE.timestamp}`);

  // Send the OTP to the user (e.g., via email)
  const sendingOtp = await EmailService.sendPasswordResetCode(
    user.email,
    user.username,
    OTP_STATE.code
  );

  await EmailService.sendEmail(sendingOtp);

  res.status(201).send({ msg: "A reset password code is sent to your email!" });
}

/** POST: http://localhost:5000/api/verifyOTP */
export async function verifyOTP(req, res) {
  const { code } = req.body;

  // Ensure OTP_STATE exists and is an object with code and timestamp
  if (OTP_STATE && OTP_STATE.code) {
    if (parseInt(OTP_STATE.code) === parseInt(code)) {
      OTP_STATE = {}; // reset the OTP_STATE
      req.app.locals.resetSession = true; // start session for reset password
      return res.status(201).send({ msg: "Verified Successfully!" });
    }
  }
  
  return res.status(400).send({ error: "Invalid OTP" });
}

/** GET: http://localhost:5000/api/createResetSession */
export async function createResetSession(req, res) {
  if (req.app.locals.resetSession) {
    return res.status(201).send({ flag: req.app.locals.resetSession });
  }
  return res.status(440).send({ error: "Session expired!" });
}

/** PUT: http://localhost:5000/api/resetPassword */
export async function resetPassword(req, res) {
  const email= EMAIL;
  try {
    if (!req.app.locals.resetSession) {
      return res.status(440).send({ error: "Session expired!" });
    }

    const { password } = req.body;

    const user = await UserModel.findOne({ email: email});
    if (!user) {
      return res.status(404).send({ error: "Username not Found" });
    }
    const salt = await bcrypt.genSalt(10); // Generate a random salt

    const hashedPassword = await bcrypt.hash(password, salt);

    await UserModel.updateOne(
      { username: user.username },
      { password: hashedPassword }
    );

    req.app.locals.resetSession = false; // reset session
    EMAIL=null
    return res
      .status(201)
      .send({ msg: "You have successfully resetted your password...!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
}

// Endpoint for change password
export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;
  const id = req.user;
  try {
    // Check if the username is already taken
    const user = await UserModel.findOne({ _id: id.userId });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Compare old password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Generate salt and hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database
    await UserModel.findByIdAndUpdate(
      { _id: id.userId },
      { password: hashedPassword }
    );

    return res.status(201).send({ msg: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
}

// Endpoint to send invitations
export async function sendInvitations(req, res) {
  try {
    let users = [];
    if (req.body.selectedRoles) {
      // Role-based filtering
      const selectedRoles = req.body.selectedRoles;
      // Validate selectedRoles
      if (
        !Array.isArray(selectedRoles) ||
        selectedRoles.some((id) => !mongoose.Types.ObjectId.isValid(id))
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid selected roles." });
      }
      // Get users based on selected roles
      users = await UserService.getUsersByRoles(selectedRoles);
    } else if (req.body.selectedUsers) {
      // Individual user selection
      const selectedUsers = req.body.selectedUsers;
      // Validate selectedUsers
      if (
        !Array.isArray(selectedUsers) ||
        selectedUsers.some((user) => typeof user !== "string")
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid selected users." });
      }
      // Get users based on usernames or emails
      users = await UserService.getUsersByUsernameOrEmail(selectedUsers);
    } else {
      // Invalid request
      return res.status(400).json({
        success: false,
        message:
          "Invalid request. Please provide selectedRoles or selectedUsers.",
      });
    }


    const result = await UserService.sendInvitation(users);
    if(result.success==true){
      return res.status(200).json(result);
    }else{
    return res.status(400).json(result);
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

// resend otp invitaion by email
export async function resendInvitationEmail(req, res) {
  try {
    const identifier = req.body.identifier; // Username or email of the user requesting the resend
    // Validate identifier
    if (!identifier || typeof identifier !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid identifier." });
    }

    // Find the user based on the identifier
    const user = await UserService.findUserByIdentifier(identifier);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    const defaultPassword = await UserService.generateDefaultPassword();
    const hashedPassword = await UserService.hashPassword(defaultPassword);
    const email = await EmailService.sendInvitation(
      user.email,
      user.username,
      defaultPassword
    );

    await EmailService.sendEmail(email);
    user.password = hashedPassword;
    await user.save();
    // Update account creation status to "Sent" after sending the invitation
    await UserService.updateAccountCreationStatus(user._id);

    return res.status(200).json({
      success: true,
      message: "Invitation email resent successfully.",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

// Deactivate user account
export async function deactivateAccount(req, res) {
  const userId = req.params.userId;

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.activationStatus === "Activated") {
      user.activationStatus = "Deactivated";
      await user.save();
    } else {
      return res
        .status(200)
        .json({ message: "User account is already blocked" });
    }

    return res
      .status(200)
      .json({ message: "User account deactivated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Activate user account
export async function activateAccount(req, res) {
  const userId = req.params.userId;

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.activationStatus === "Deactivated") {
      user.activationStatus = "Activated";
      await user.save();
    } else {
      return res
        .status(200)
        .json({ message: "User account is already activated" });
    }

    return res
      .status(200)
      .json({ message: "User account activated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// filter users by their roles and status  
export async function filterUsersByRoleAndStatus(req, res) {
  const { roleName, status, accountCreationStatus, activationStatus } = req.body;

  try {
    // Construct base query
    let query = {};

    // Add role filter if provided
    if (roleName) {
      const roles = await RoleModel.find({ roleName: { $regex: new RegExp(roleName, 'i') } });
      const roleIds = roles.map(role => role._id);
      if (roleIds.length > 0) {
        query.role_id = { $in: roleIds };
      }
    }

    // Add status type filter if provided
    if (status) {
      if (Array.isArray(status) && status.length > 0) {
        query.status = { $in: status };
      } else if (typeof status === 'string') {
        query.status = status;
      }
    }

    // Add account creation status filter if provided
    if (accountCreationStatus) {
      if (Array.isArray(accountCreationStatus) && accountCreationStatus.length > 0) {
        query.accountCreationStatus = { $in: accountCreationStatus };
      } else if (typeof accountCreationStatus === 'string') {
        query.accountCreationStatus = accountCreationStatus;
      }
    }
    
    // Add activation status filter if provided
    if (activationStatus) {
      if (Array.isArray(activationStatus) && activationStatus.length > 0) {
        query.activationStatus = { $in: activationStatus };
      } else if (typeof activationStatus === 'string') {
        query.activationStatus = activationStatus;
      }
    }

    // Execute the query
    const users = await UserModel.find(query).populate('role_id', 'roleName');

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found matching the criteria" });
    }

    // Sanitize users data to return roleName instead of role_id
    const sanitizedUsers = users.map(user => ({
      userId: user._id,
      username: user.username,
      email: user.email,
      role_id: user.role_id._id,
      roleName: user.role_id.roleName,
      status: user.status,
    }));

    return res.status(200).json({ users: sanitizedUsers });
  } catch (error) {
    console.error("Error filtering users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function searchUsers(req, res) {
  const { username, email } = req.query;

  try {
    // Construct query object
    let query = {};

    // Add filters to the query object if provided
    if (username) {
      query.username = { $regex: new RegExp(username, 'i') }; // Case-insensitive search
    }
    if (email) {
      query.email = { $regex: new RegExp(email, 'i') }; // Case-insensitive search
    }
   
    // Execute the query
    const users = await UserModel.find(query).populate('role_id', 'roleName');

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found matching the criteria" });
    }

    // Sanitize users data to return roleName instead of role_id
    const sanitizedUsers = users.map(user => ({
      userId: user._id,
      username: user.username,
      email: user.email,
      role_id: user.role_id._id,
      roleName: user.role_id.roleName,
      status: user.status,
    }));

    return res.status(200).json({ users: sanitizedUsers });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}