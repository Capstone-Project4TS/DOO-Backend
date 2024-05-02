import UserModel  from "../models/users.model.js";
import dayjs from "dayjs";


export const getUser = (user) => user.hidePassword();

export const createUser = ({ username, email, password }) => new UserModel({ username, email, password });

export const setResetPasswordToken = (user, resetTokenValue, expiryDate) => {
  user.passwordResetToken = resetTokenValue;
  user.passwordResetExpires = expiryDate;
};

export const findUserBy = async (prop, value) => await UserModel.findOne({ [prop]: value });

export const findUserById = async (id) => await UserModel.findById(id);

export const saveUser = async (user) => await user.save();

export const setUserPassword = async (user, password) => {
  user.password = password;
  user.passwordResetToken = "";
  user.passwordResetExpires = dayjs().toDate();
  return await user.hashPassword();
};

export const setUserVerified = async (user) => {
  user.isVerified = true;
  user.expires = undefined;
};

export const deleteUserById = async (user) => await UserModel.findByIdAndDelete(user._id);

export const deleteUnverifiedUserByEmail = async (email) =>
  await UserModel.findOneAndDelete({ email, isVerified: false });

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
            const daysSinceLastLogin = lastLoginDate ? dayjs().diff(dayjs(lastLoginDate), 'day') : Infinity;

            // Update user status
            if (daysSinceLastLogin <= 1) {
                user.status = 'Active';
            } else {
                user.status = 'Inactive';
            }

            await user.save();
        }
    } catch (error) {
        console.error(error);
    }
}


// Function to update account creation status when invite is sent
export const updateAccountCreationStatus= async(userId)=> {
  try {
      const user = await UserModel.findById(userId);

      if (!user) {
          return; // User not found
      }
     if(user.accountCreationStatus =='Not Sent'){
      user.accountCreationStatus = 'Sent';
      await user.save();
     }else{
      return;
     }
  } catch (error) {
      console.error(error);
  }
}

// Function to track login attempts and lock user account if necessary
export async function trackLoginAttempts (email) {
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
export const resetLoginAttempts= async (email) =>{
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

// export default {
//   getUser,
//   createUser,
//   updateUserStatus,
//   setResetPasswordToken,
//   updateAccountCreationStatus,
//   resetLoginAttempts,
//   trackLoginAttempts,
//   findUserBy,
//   findUserById,
//   saveUser,
//   setUserPassword,
//   setUserVerified,
//   deleteUserById,
//   deleteUnverifiedUserByEmail,
// };
