import UserModel from "../models/users.model.js";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import otpGenerator from "otp-generator";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import * as EmailService from "../services/emailService.js";
import * as UserService from "../services/userService.js";


const uri = "mongodb+srv://root:root@cluster0.nchnoj6.mongodb.net/HR";
const dbName = "HR";
const collectionName = "users";


// Function to update user status based on login activity or update all users' statuses
export const updateUserStatus = async (userId = null) => {
  try {
    let usersToUpdate = [];

    if (userId) {
      // Update status for a specific user
      const user = await UserModel.findById(userId);
      if (user) {
        usersToUpdate.push(user);
      }
    } else {
      // Update statuses for all users
      usersToUpdate = await UserModel.find({});
    }

    for (const user of usersToUpdate) {
      // Check if the user has logged in recently
      const lastLoginDate = user.lastLoginDate;
      const daysSinceLastLogin = lastLoginDate
        ? dayjs().diff(dayjs(lastLoginDate), "day")
        : Infinity;

      // Update user status
      if (daysSinceLastLogin <= 1) {
        user.status = "Active";
      } else {
        user.status = "Inactive";
      }

      await user.save();
    }
  } catch (error) {
    console.error(error);
  }
};

// Function to update account creation status when invite is sent
export const updateAccountCreationStatus = async (userId) => {
  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return; // User not found
    }
    if (user.accountCreationStatus == "Not Sent") {
      user.accountCreationStatus = "Sent";
      await user.save();
    } else {
      return;
    }
  } catch (error) {
    console.error(error);
  }
};

// Function to track login attempts and lock user account if necessary
export async function trackLoginAttempts(email) {
  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return; // User not found
    }

    const MAX_LOGIN_ATTEMPTS = 2;
    const LOCK_TIME = 1 * 60 * 60 * 1000; // 1 hour

    if (user.lockUntil && user.lockUntil > Date.now()) {
      // Account is currently locked
      const timeUntilUnlock = Math.ceil((user.lockUntil - Date.now()) / 1000); // Convert milliseconds to seconds
      return timeUntilUnlock;
    }

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = Date.now() + LOCK_TIME;
      user.loginAttempts = 0; // Reset login attempts
    } else {
      user.loginAttempts += 1;
    }

    await user.save();
  } catch (error) {
    console.error(error);
  }
}

// Function to reset login attempts after successful login
export const resetLoginAttempts = async (email) => {
  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return; // User not found
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  } catch (error) {
    console.error(error);
  }
};

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10); // Generate a random salt
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
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



export async function getUser() {
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
      return { error: "No users found" };

    const sanitizedUsers = users.map((user) => {
      const { username, email, role_id } = user;
      return { username, email, role_id };
    });

    return sanitizedUsers;
  } catch (error) {
    console.error("Error fetching user information:", error);
    return { error: "Internal Server Error" , error};
  } finally {
    await client.close();
  }
}



export async function createUser(user) {

  try {
    
    const defaultPassword = await generateDefaultPassword();
    const hashedPassword = await UserService.hashPassword(defaultPassword);

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

export async function getUsersByRoles(selectedRoles) {
  try {
    // Query the database to find users based on selected roles
    const users = await UserModel.find({ role_id: { $in: selectedRoles } });
    return users;
  } catch (error) {
    throw error;  
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

export async function findUserByIdentifier(identifier) {
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
export  async function generateDefaultPassword() {
  const pass = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  return pass;
}
