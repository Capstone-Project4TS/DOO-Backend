import nodemailer from 'nodemailer';
import generateToken from '../utils/token.js';
import UserModel from '../models/users.model.js';

const createMailTransporter = async () => {
    const transporter = nodemailer.createTransport({
        service: "hotmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS,
        },
    });
    return transporter;
};

export const sendVerificationEmail = async (user) => {
    const transporter = await createMailTransporter();
    const mailOptions = {
        from: '"Chatt App" < sitra234@outlook.com> ',
        to: user.email,
        subject: "Verify your email...",
        html: `<p>Hello ${user.name}, verify your email by clicking this link...</p>
        <a href='${process.env.CLIENT_URL}/verify-email?emailToken=${user.emailToken}'>Verify Your
        Email</a>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log("Verification email sent");
        }
    });
};

export const verifyEmail = async (req, res) => {
    try {
        const emailToken = req.body.emailToken.trim();
        if (!emailToken) {
            return res.status(404).json("EmailToken not found...");
        }
        const user = await UserModel.findOne({ emailToken: emailToken });
        console.log(emailToken);
        console.log(user);

        if (user) {
            user.emailToken = null;
            user.isActive = true;
            await user.save();
            const token = generateToken(res, user._id);
            res.status(200).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token,
                isActive: user?.isActive,
            });
        } else res.status(404).json("Email verification failed, invalid token!");
    } catch (error) {
        console.log(error);
        res.status(500).json(error.message);
    }
};