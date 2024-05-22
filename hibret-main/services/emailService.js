import nodemailer from "nodemailer";

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

export const sendInvitation = async (email, username, password) => {
  const mailOptions = {
    from: '"DMS Hibret Bank" < sitra234@outlook.com> ',
    to: email,
    subject: "Log into your Account by using this password",
    html: `<p>Hello ${username},</p>
           <p>Your default password is: <strong>${password}</strong></p>
           <p>Please verify your email by clicking this link: <a href="http://${process.env.CLIENT_URL}/account/confirm">http://${process.env.CLIENT_URL}/account/confirm</a></p>`,
  };
  return mailOptions;
};

export const sendPasswordResetCode = async (email, username, otp) => {
  const mailOptions = {
    from: '"DMS Hibret Bank" < sitra234@outlook.com> ',
    to: email,
    subject: "Here is the reset code verify it!",
    html: `<p>Hello ${username},</p>
         <p>Your reset code is: <strong>${otp}</strong></p>
         <p>Please verify your code by clicking this link: <a href="http://${process.env.CLIENT_URL}/account/confirm">http://${process.env.CLIENT_URL}/account/confirm</a></p>`,
  };
  return mailOptions;
};

export const sendEmail = async (email) => {
  const transporter = await createMailTransporter();
  try {
    await transporter.sendMail(email);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
