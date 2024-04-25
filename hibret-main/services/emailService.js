import nodemailer from 'nodemailer';
import generateToken from './tokenService.js';
import UserModel from '../models/users.model.js';

export const createMailTransporter = async () => {
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
   
    const mailOptions = {
        from: '"DMS Hibret Bank" < sitra234@outlook.com> ',
        to: user.email,
        subject: "Verify your email...",
        text: `Hello ${user.username},\n\nYour default password is: ${user.password}\n\nPlease verify your email by clicking this link: http://${process.env.CLIENT_URL}/account/confirm`,
        html: `<p>Hello ${user.name},</p>
           <p>Your default password is: <strong>${user.password}</strong></p>
           <p>Please verify your email by clicking this link: <a href="http://${process.env.CLIENT_URL}/account/confirm">http://${process.env.CLIENT_URL}/account/confirm</a></p>`,
    };
    return mailOptions;
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

export const createResetPasswordEmail = (receiverEmail, resetTokenValue) => {
    return {
      from: process.env.EMAIL,
      to: receiverEmail,
      subject: "Reset password link",
      text: "Some useless text",
      html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n Please click on the following link, or paste this into your browser to complete the process:\n\n
    <a href="http://${host}/login/reset/${resetTokenValue}">http://${host}/login/reset/${resetTokenValue}</a> \n\n If you did not request this, please ignore this email and your password will remain unchanged.\n </p>`,
    };
  };
  
  export const createResetConfirmationEmail =async (receiverEmail) => {
    return {
      from: process.env.EMAIL,
      to: receiverEmail,
      subject: "Your password has been changed",
      text: "Some useless text",
      html: `<p>This is a confirmation that the password for your account ${receiverEmail} has just been changed. </p>`,
    };
  };
  
  // Function to send email
export const sendEmail = async (email) => {
    const transporter = await createMailTransporter();
    try {
      await transporter.sendMail(email);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };