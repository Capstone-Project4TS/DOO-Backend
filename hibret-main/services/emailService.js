import nodemailer from 'nodemailer';

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

export const sendVerificationEmail = async (email,username,password) => {
   
    const mailOptions = {
        from: '"DMS Hibret Bank" < sitra234@outlook.com> ',
        to: email,
        subject: "Verify your email...",
        html: `<p>Hello ${username},</p>
           <p>Your default password is: <strong>${password}</strong></p>
           <p>Please verify your email by clicking this link: <a href="http://${process.env.CLIENT_URL}/account/confirm">http://${process.env.CLIENT_URL}/account/confirm</a></p>`,
    };
    return mailOptions;
};

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