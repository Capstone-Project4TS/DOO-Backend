import UserModel from '../models/users.model.js';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import generateToken from '../services/tokenService.js';
import TokenModel from '../models/token.model.js';
import SessionModel from '../models/session.model.js';
import * as UserServise from '../services/userService.js';
import { validateEmail, validateLoginInput, validatePassword } from "../validations/user.validation.js";


function generateUUID() {
    return createHash('sha1')
        .update(Math.random().toString())
        .digest('hex')
        .substring(0, 24);
}

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

// POST: http://localhost:5000/api/login
export async function login(req, res) {

    const { email, password } = req.body;
    const { error } = validateLoginInput(req.body);

    if (error) return res.status(400).send({ message: error.details[0].message });

    try {
        // Find the user by email
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).send({ error: "Invalid email or password." });
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).send({ error: "Invalid email or password." });
        }

        // Create session
        const sessionId = generateUUID(); // Generate a unique session ID
        const session = new SessionModel({
            sessionId,
            userId: user._id,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        });
        await session.save();

        // Set session ID in cookie
        // res.cookie('sessionId', sessionId, { httpOnly: true, secure: true, sameSite: 'strict' });

        // Create JWT token
        const token = await generateToken(res,user._id);

        // Save token data in database
        const tokenData = new TokenModel({
            userId: user._id,
            token,
            createdAt: new Date(),
        });
        await tokenData.save();

        // Check user's role and customize response
        let msg = "Login Successful...!";
        if (user.role === "admin") {
            msg += " (Admin)";
        } else {
            msg += user.username;
        }

        // Store user session information
        req.session = { id: user._id, username: user.username, role: user.role };

        // Reset login attempts
        // await UserServise.resetLoginAttempts(email);

        // Return success response
        return res.status(200).send({
            msg,
            username: user.username,
            role: user.role,
            token
        });
    } catch (error) {
        console.error('Error occurred during login:', error);
        return res.status(500).send({ error: "Internal server error." });
    }
}


export async function Logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).send({ message: "Logout failed", err });
        }
        //   req.sessionID = "";
        //   req.logout();
        res.status(200).send({ message: "Logout success" });
    });
};
