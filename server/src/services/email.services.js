const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (email, token) => {
  console.log("EMAIL TOKEN:", token);

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
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