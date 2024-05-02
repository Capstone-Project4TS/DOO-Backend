import UserModel from '../models/users.model.js';
import bcrypt from 'bcrypt';
import generateToken from '../services/tokenService.js';
import * as UserServise from '../services/userService.js';
import { validateEmail, validateLoginInput, validatePassword } from "../validations/user.validation.js";


/** POST: http://localhost:5000/api/authenticate */
export async function verifyUser(req, res, next) {
    try {

        const { username } = req.method == "GET" ? req.query : req.body;

        // check the user existance
        let exist = await UserModel.findOne({ username });
        if (!exist) return res.status(404).send({ error: "Can't find User!" });
        next();

    } catch (error) {
        return res.status(404).send({ error: "Authentication Error" });
    }
}

/* LOGIN endpoint*/
// POST: http://localhost:5000/api/login
export async function login(req, res) {

    const { username, email, password } = req.body;
    const { error } = validateLoginInput(req.body);
    if (error) return res.status(400).send({ message: error.details[0].message });

    try {
        // Find the user by email
        const user = await UserModel.findOne({ email });
        // After a login attempt
        const timeUntilUnlock = await UserServise.trackLoginAttempts(user.email);
        // Check if the account is locked
        if (timeUntilUnlock != null) {
            return res.status(401).send({ error: `Account locked due to too many failed login attempts. Please try again in ${timeUntilUnlock} seconds.` });
        }
        if (user.activationStatus =='Deactivated') {
            return res.status(401).send({ error: `Currently your account is locked.Please contact the Admin` });
        }
        if (!user) {
            return res.status(404).send({ error: "Invalid email or password." });
        }


        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).send({ error: "Invalid email or password." });
        }

        // Create JWT token
        const token = await generateToken(res, user._id, user.role);
        user.token = token;
        await user.save();

        // Check user's role and customize response
        let msg = "Login Successful...!";
        if (user.role === "admin") {
            msg += " Admin";
        } else {
            msg += user.username;
        }

        if(user.otp!=null){
            user.otp=null;
        }

        // Update lastLoginDate
        user.lastLoginDate = new Date();
        await user.save();

        await UserServise.updateUserStatus(user._id);
        // Reset login attempts
        await UserServise.resetLoginAttempts(email);


        // Set user information on the session
        req.session.data = {
            _id: user._id,
            username: user.username,
            role: user.role,
        };
        // Save the session (if you've modified data)
        await req.session.save();
        
       
        // Return success response
        return res.status(200).send({ msg });
    } catch (error) {
        console.error('Error occurred during login:', error);
        return res.status(500).send({ error: "Internal server error." });
    }
}

/* LOGOUT endpoint*/
// POST: http://localhost:5000/api/logout
export async function Logout(req, res) {
    try {
        if (req.session) {
            await req.session.destroy(); // Wait for asynchronous session destruction
            res.clearCookie('connect.sid'); // Clear the session cookie
            res.status(200).send({ message: "Logout successful" });
        } else {
            res.status(400).send({ error: "No active session found" });
        }
    } catch (error) {
        console.error('Error occurred during logout:', error);
        res.status(500).send({ error: "Internal server error." });
    }
};