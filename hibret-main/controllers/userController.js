import UserModel from "../models/users.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";
import Workflow from "../models/workflow.model.js";
import { selectSingleUser } from "./workflowController.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import * as EmailService from "../services/emailService.js";
import * as UserService from "../services/userService.js";
import otpGenerator from "otp-generator";
import {
  validateEmail,
  validateRegisterInput,
} from "../validations/user.validation.js";
import { MongoClient } from "mongodb";

const uri = "mongodb+srv://root:root@cluster0.nchnoj6.mongodb.net/HR";
const dbName = "HR";
const collectionName = "users";

// POST: http://localhost:5000/api/admin/user/create
export async function createAccounts(req, res) {
  const users = await getUser();

  try {
    if (!Array.isArray(users) || users.length === 0) {
      return { message: "Please provide users data." };
    }

    const createdUsers = [];
    const updatedUsers = [];
    const deletedUsers = [];

    for (const user of users) {
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
        const result = await createUser(user);
        if (!result.error) {
          createdUsers.push(user.email);
        }
      }
    }

    // Find users in our DB but not in HR DB and delete them
    const allHRUsers = users.map((user) => user.email);
    const usersToDelete = await UserModel.find({ email: { $nin: allHRUsers } });
    for (const userToDelete of usersToDelete) {
      const { _id, role_id } = userToDelete; // Get _id and role_id of user to be deleted

      // Get workflows assigned to user
      const userWorkflows = await UserWorkflow.findOne({ _id });
      if (userWorkflows) {
        for (const workflow of userWorkflows.workflows) {
          // Reassign workflow to user with least workload
          const newUserId = await selectSingleUser(role_id);

          // Add workflow to new user's UserWorkflow
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

          // Replace userToDelete's userId with newUserId in assignedUsers of workflow
          await Workflow.updateOne(
            { _id: workflow.workflowId, "assignedUsers.user": _id },
            { $set: { "assignedUsers.$.user": newUserId } }
          );
        }
      }

      // Delete user from UserModel
      await UserModel.deleteOne({ email: userToDelete.email });
      deletedUsers.push(userToDelete.email);
    }

    return { message: "Users synchronization completed successfully" };
  } catch (error) {
    console.error("Error synchronizing users:", error);
    return { message: "Internal server error" };
  }
}

export async function createUser(user) {
  // const { error } = validateRegisterInput(user);
  // if (error) return { error: error.details[0].message };

  try {
    async function hashPassword(password) {
      const salt = await bcrypt.genSalt(10); // Generate a random salt
      const hashedPassword = await bcrypt.hash(password, salt);
      return hashedPassword;
    }
    const defaultPassword = await generateDefaultPassword();
    const hashedPassword = await hashPassword(defaultPassword);

    // Create a new user object with verification token
    const newUser = new UserModel({
      otp: defaultPassword,
      password: hashedPassword, // Consider hashing the password before saving it
      email: user.email,
      role_id: new mongoose.Types.ObjectId(user.role_id),
      username: user.username,
    });

    // Save the user to the database
    await newUser.save();

    // Return the newly created user
    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    return { error: "Internal server error" };
  }
}

export async function getUser(req, res) {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    const users = await collection.find({}).toArray();

    if (!users || users.length === 0)
      return res.status(404).send({ error: "No users found" });

    // Extract relevant user data (username, email, and role)
    const sanitizedUsers = users.map((user) => {
      const { username, email, role_id } = user; // Extract only desired fields
      return { username, email, role_id };
    });

    return sanitizedUsers; // Send user data to the client
  } catch (error) {
    console.error("Error occurred while fetching user information:", error);
    return { error: "Internal Server Error" };
  } finally {
    // Close the connection
    await client.close();
  }
}

export async function getAllUsers(req, res) {
  try {
    const users = await UserModel.find({});
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST: http://localhost:5000/api/generateOTP */
export async function generateOTP(req, res) {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });
  req.app.locals.OTP = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const sendingOtp = await EmailService.sendPasswordResetCode(
    user.email,
    user.username,
    req.app.locals.OTP
  );
  await EmailService.sendEmail(sendingOtp);

  res.status(201).send({ msg: "A reset password code is sent to your email!" });
}

/** GET: http://localhost:5000/api/verifyOTP */
export async function verifyOTP(req, res) {
  const { code } = req.body;
  if (parseInt(req.app.locals.OTP) === parseInt(code)) {
    req.app.locals.OTP = null; // reset the OTP value
    req.app.locals.resetSession = true; // start session for reset password
    return res.status(201).send({ msg: "Verify Successsfully!" });
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
  const id = req.user;
  try {
    if (!req.app.locals.resetSession) {
      return res.status(440).send({ error: "Session expired!" });
    }

    const { password } = req.body;

    const user = await UserModel.findOne({ _id: id.userId });
    console.log(user)
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
    return res
      .status(201)
      .send({ msg: "You have successfully resetted your password...!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).send({ error: "Internal server error" });
  }
}

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
      users = await getUsersByRoles(selectedRoles);
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
      users = await getUsersByUsernameOrEmail(selectedUsers);
    } else {
      // Invalid request
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid request. Please provide selectedRoles or selectedUsers.",
        });
    }
    const result = await sendInvitation(users);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
}

export async function sendInvitation(users) {
  try {
    for (const user of users) {
      const email = await EmailService.sendInvitation(
        user.email,
        user.username,
        user.otp
      );
      await EmailService.sendEmail(email);

      // Update account creation status to "Sent" after sending the invitation
      await UserService.updateAccountCreationStatus(user._id);
    }

    return { success: true, message: "Invitations sent successfully." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to send invitations." };
  }
}

export async function getUsersByRoles(selectedRoles) {
  try {
    // Query the database to find users based on selected roles
    const users = await UserModel.find({ role_id: { $in: selectedRoles } });
    return users;
  } catch (error) {
    throw error;
  }
}

export async function getUsersByUsernameOrEmail(selectedUsers) {
  try {
    // Query the database to find users based on usernames or emails
    const users = await UserModel.find({
      $or: [
        { username: { $in: selectedUsers } },
        { email: { $in: selectedUsers } },
      ],
    });
    return users;
  } catch (error) {
    throw error;
  }
}

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
    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
     const defaultPassword = await generateDefaultPassword();
    const email = await EmailService.sendInvitation(
      user.email,
      user.username,
      defaultPassword
    );
    await EmailService.sendEmail(email);

    // Update account creation status to "Sent" after sending the invitation
    await UserService.updateAccountCreationStatus(user._id);

    return res
      .status(200)
      .json({
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

async function findUserByIdentifier(identifier) {
  try {
    // Query the database to find the user based on username or email
    const user = await UserModel.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    return user;
  } catch (error) {
    throw error;
  }
}

// Function to generate a default password
async function generateDefaultPassword() {
  const pass = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  return pass;
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

// filter users
export async function filterUsersByRoleAndStatus(
  role,
  status,
  accountCreationStatus,
  activationStatus
) {
  try {
    // Construct base query
    let query = {};

    // Add role filter if provided
    if (role) {
      query.role = role;
    }

    // Add status type filter if provided
    if (status) {
      query.status = status;
    }

    if (accountCreationStatus) {
      query.accountCreationStatus = accountCreationStatus;
    }
    if (activationStatus) {
      query.activationStatus = activationStatus;
    }
    // Execute the query
    const users = await UserModel.find(query);
    return users;
  } catch (error) {
    console.error("Error filtering users:", error);
    throw error;
  }
}
