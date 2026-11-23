const nodemailer = require("nodemailer");

const getTransporter = () => {
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
  const smtpSecure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : smtpPort === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });
};

const transporter = getTransporter();

const verifyTransporter = async () => {
  return transporter.verify();
};

const sendVerificationEmail = async (email, token) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verificationUrl = `${clientUrl}/verify-email/${token}`;

  const senderUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const fromEmail =
    process.env.EMAIL_FROM ||
    (senderUser
      ? `"AI Interview Agent" <${senderUser}>`
      : "AI Interview Agent");

  const mailOptions = {
    from: fromEmail,
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(
      "Email service error:",
      error?.message || "Failed to send email"
    );
    throw error;
  }
};

const sendPasswordResetEmail = async (email, token) => {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  const senderUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const fromEmail =
    process.env.EMAIL_FROM ||
    (senderUser
      ? `"AI Interview Agent" <${senderUser}>`
      : "AI Interview Agent");

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: "Reset your AI Interview Agent password",
    html: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset the password for your AI Interview Agent account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}"
         style="
           display:inline-block;
           padding:12px 20px;
           background:#2563eb;
           color:white;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
         ">
        Reset Password
      </a>
      <p>This password reset link will expire in 1 hour.</p>
      <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(
      "Email service error (Password Reset):",
      error?.message || "Failed to send password reset email"
    );
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyTransporter,
};
