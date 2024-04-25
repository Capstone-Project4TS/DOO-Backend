import UserModel from '../models/users.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
// import { sendVerificationEmail } from '../services/emailService.js'
import * as EmailService from '../services/emailService.js';
import otpGenerator from 'otp-generator';
import { validateEmail, validateRegisterInput } from "../validations/user.validation.js";


// POST: http://localhost:5000/api/admin/user/create
export async function createAccounts(req, res) {
    const users = req.body;
   
    try {
        // Check if request body contains user data array
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of user objects in the request body.' });
        }

        // Loop through each user object in the request body
        const createdUsers = [];
        const failedUsers = []; // Store failed user creations
        for (const user of users) {
            const newUser = await createUser(user); // Call the existing createUser function
            if (newUser.error) {
                // If an error occurred, push the user to failedUsers array
                failedUsers.push({ user, error: newUser.error });
            } else {
                // If user creation was successful, push the user to createdUsers array
                createdUsers.push(newUser);
            }
        }

        if (failedUsers.length > 0) {
            // If there are failed user creations, return a 400 status with failed users information
            return res.status(400).json({ message: 'Some users were not created successfully.', failedUsers });
        }

        // If all user creations were successful, return a 201 status with created users information
        res.status(201).json({  data: createdUsers });
    } catch (error) {
        console.error('Error creating users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}   


// Route to create a new user with email verification

export async function createUser(user) {

    const { error } = validateRegisterInput(user);
    if (error) return { message: error.details[0].message };
  
    try {
        // Check if the username is already taken
        const existingUser = await UserModel.findOne({ email: user.email });
        if (existingUser) {
            return 'Email is already taken';
        }
        const Username = await UserModel.findOne({ username: user.username });
        if (Username) {
            return 'Username is already taken';
        }

        async function hashPassword(password) {
            const salt = await bcrypt.genSalt(10); // Generate a random salt
            const hashedPassword = await bcrypt.hash(password, salt);
            return hashedPassword;
        }

        const defaultPassword = crypto.randomBytes(10).toString("hex");
        const hashedPassword = await hashPassword(user.password);
        const verificationToken = crypto.randomBytes(64).toString("hex");

        // Create a new user object with verification token
        const newUser = new UserModel({
            password: hashedPassword,
            email: user.email,
            role: user.role,
            username: user.username,
            emailToken: verificationToken,
        });

        // Save the user to the database
        await newUser.save();

        // Send verification email
        // await sendVerificationEmail(newUser);
        return newUser;
    } catch (error) {
        console.error('Error creating user:', error);
        return 'Internal server error';
    }
}


/** GET: http://localhost:5000/api/user/example123 */
export async function getUser(req, res) {

    const { username } = req.params;
    
    try {

        if (!username) return res.status(501).send({ error: "Invalid Username" });

              const user=await UserModel.findOne({ username });
            if (!user) return res.status(501).send({ error: "Couldn't Find the User" });

            /** remove password from user */
            // mongoose return unnecessary data with object so convert it into json
            const { password, ...rest } = Object.assign({}, user.toJSON());

            return res.status(201).send(rest);

    } catch (error) {
        return res.status(404).send({ error: "Cannot Find User Data" });
    }

}

/** GET: http://localhost:5000/api/generateOTP */
export async function generateOTP(req, res) {
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false })
    res.status(201).send({ code: req.app.locals.OTP })
}

/** GET: http://localhost:5000/api/verifyOTP */
export async function verifyOTP(req, res) {
    const { code } = req.query;
    if (parseInt(req.app.locals.OTP) === parseInt(code)) {
        req.app.locals.OTP = null; // reset the OTP value
        req.app.locals.resetSession = true; // start session for reset password
        return res.status(201).send({ msg: 'Verify Successsfully!' })
    }
    return res.status(400).send({ error: "Invalid OTP" });
}

// successfully redirect user when OTP is valid
/** GET: http://localhost:5000/api/createResetSession */
export async function createResetSession(req, res) {
    if (req.app.locals.resetSession) {
        return res.status(201).send({ flag: req.app.locals.resetSession })
    }
    return res.status(440).send({ error: "Session expired!" })
}

// update the password when we have valid session
/** PUT: http://localhost:5000/api/resetPassword */
export async function resetPassword(req, res) {
    try {
        if (!req.app.locals.resetSession) {
            return res.status(440).send({ error: "Session expired!" });
        }

        const { username, password } = req.body;

        const user = await UserModel.findOne({ username });

        if (!user) {
            return res.status(404).send({ error: "Username not Found" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await UserModel.updateOne({ username: user.username }, { password: hashedPassword });

        req.app.locals.resetSession = false; // reset session
        return res.status(201).send({ msg: "Record Updated...!" });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).send({ error: "Internal server error" });
    }

}


export async function changePassword(req, res) {
    const {  oldPassword, newPassword } = req.body;
    const id= req.user;
    try {

     // Check if the username is already taken
     const user = await UserModel.findOne({ _id: id.userId});
     console.log(user)
      // Check if user exists
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    // Compare old password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ message: 'Old password is incorrect' });
    }

    // Generate salt and hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password in the database
    await UserModel.findByIdAndUpdate( {_id: id.userId}, { password: hashedPassword });
  
      return res.status(201).send({ msg: "Password changed successfully." });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).send({ error: "Internal server error" });
    }
  }
  

  // Endpoint to send invitations
  export async function sendInvitations(req, res) {
    try {
        const selectedRoles = req.body.selectedRoles; // Assuming you pass selected roles in the request body
        const users = await getUsersByRoles(selectedRoles);
        const result = await sendInvitation(users);
        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export async function sendInvitation (users){
    try {
        for (const user of users) {

           const email=  await EmailService.sendVerificationEmail(user);
           await EmailService.sendEmail(email);
             
            // Update account creation status to "Sent" after sending the invitation
            // await UserService.updateAccountCreationStatus(user.username, "Sent");
        }

        return { success: true, message: "Invitations sent successfully." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to send invitations." };
    }
};


export async function getUsersByRoles (selectedRoles) {
    try {
        // Query the database to find users based on selected roles
        const users = await UserModel.find({ role: { $in: selectedRoles } });
        console.log(users);
        return users;
    } catch (error) {
        throw error;
    }
};
  // Function to generate a default password
  async function generateDefaultPassword() {
    // Implement your password generation logic here
    return "default123"; // Dummy default password, replace with your logic
  }
  

  // UserController.js

// Deactivate user account
export async function deactivateAccount(req, res) {
    const userId = req.params.userId;

    try {
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.isActive = false; // Assuming there's a field in the user model to track account status
        await user.save();

        return res.status(200).json({ message: "User account deactivated successfully" });
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

        user.isActive = true; // Assuming there's a field in the user model to track account status
        await user.save();

        return res.status(200).json({ message: "User account activated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


// filter users

export async function filterUsersByRoleAndStatus(role, statusType) {
    try {
        // Construct base query
        let query = {};

        // Add role filter if provided
        if (role) {
            query.role = role;
        }

        // Add status type filter if provided
        if (statusType) {
            // Assume 'statusType' is a field in the database schema
            query.statusType = statusType;
        }

        // Execute the query
        const users = await UserModel.find(query);
        return users;
    } catch (error) {
        console.error('Error filtering users:', error);
        throw error;
    }
}
