const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  console.log("EMAIL TOKEN:", token);

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your AI Interview Agent account",
    html: `
      <h2>Welcome to AI Interview Agent!</h2>

      <p>Thanks for creating an account.</p>

      <p>Please click the button below to verify your email address:</p>

      <a href="${verificationUrl}"
         style="
           display:inline-block;
           padding:12px 20px;
           background:#2563eb;
           color:white;
           text-decoration:none;
           border-radius:6px;
         ">
        Verify Email
      </a>

      <p>This verification link will expire in 24 hours.</p>
    `,
  });
};

module.exports = {
  sendVerificationEmail,
};
