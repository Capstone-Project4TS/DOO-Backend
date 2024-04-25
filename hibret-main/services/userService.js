import User  from "../models/users.model.js";
import dayjs from "dayjs";

const getUser = (user) => user.hidePassword();

const createUser = ({ username, email, password }) => new User({ username, email, password });

const setResetPasswordToken = (user, resetTokenValue, expiryDate) => {
  user.passwordResetToken = resetTokenValue;
  user.passwordResetExpires = expiryDate;
};

const findUserBy = async (prop, value) => await User.findOne({ [prop]: value });

const findUserById = async (id) => await User.findById(id);

const saveUser = async (user) => await user.save();

const setUserPassword = async (user, password) => {
  user.password = password;
  user.passwordResetToken = "";
  user.passwordResetExpires = dayjs().toDate();
  return await user.hashPassword();
};

const setUserVerified = async (user) => {
  user.isVerified = true;
  user.expires = undefined;
};

const deleteUserById = async (user) => await User.findByIdAndDelete(user._id);

const deleteUnverifiedUserByEmail = async (email) =>
  await User.findOneAndDelete({ email, isVerified: false });

  // Function to update user status based on login activity
const updateUserStatus =async (userId) =>{
  try {
      const user = await UserModel.findById(userId);

      if (!user) {
          return; // User not found
      }

      // Check if the user has logged in recently
      const lastLoginDate = user.lastLoginDate;
      const daysSinceLastLogin = lastLoginDate ? dayjs().diff(dayjs(lastLoginDate), 'day') : Infinity;

      // Update user status
      if (daysSinceLastLogin <= 3) {
          user.status = 'Active';
      } else {
          user.status = 'Inactive';
      }

      await user.save();
  } catch (error) {
      console.error(error);
  }
}

// Function to update account creation status when invite is sent
const updateAccountCreationStatus= async(userId)=> {
  try {
      const user = await UserModel.findById(userId);

      if (!user) {
          return; // User not found
      }

      user.accountCreationStatus = 'Sent';
      await user.save();
  } catch (error) {
      console.error(error);
  }
}

// Function to track login attempts and lock user account if necessary
async function trackLoginAttempts (email) {
  try {
      const user = await UserModel.findOne({ email });

      if (!user) {
          return; // User not found
      }

      const MAX_LOGIN_ATTEMPTS = 5;
      const LOCK_TIME = 1 * 60 * 60 * 1000; // 1 hour

      if (user.lockUntil && user.lockUntil > Date.now()) {
          // Account is currently locked
          return;
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
const resetLoginAttempts= async (email) =>{
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
}

export default {
  getUser,
  createUser,
  updateUserStatus,
  setResetPasswordToken,
  updateAccountCreationStatus,
  resetLoginAttempts,
  trackLoginAttempts,
  findUserBy,
  findUserById,
  saveUser,
  setUserPassword,
  setUserVerified,
  deleteUserById,
  deleteUnverifiedUserByEmail,
};
