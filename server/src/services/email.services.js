const { Resend } = require("resend");

console.log("EMAIL SERVICE: Loading...");

const resend = new Resend(process.env.RESEND_API_KEY);

console.log("EMAIL SERVICE: Resend initialized");

const sendVerificationEmail = async (email, token) => {
  console.log("EMAIL SERVICE: Function called");
  console.log("EMAIL TO:", email);
  console.log("EMAIL TOKEN:", token);

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  console.log("VERIFICATION URL:", verificationUrl);
  console.log("EMAIL SERVICE: About to call Resend");

  try {
    const { data, error } = await resend.emails.send({
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

    console.log("EMAIL SERVICE: Resend call completed");
    console.log("RESEND DATA:", data);
    console.log("RESEND ERROR:", error);

    if (error) {
      throw new Error(
        error.message || "Failed to send verification email"
      );
    }

    console.log("EMAIL SERVICE: Email sent successfully");

    return data;
  } catch (error) {
    console.error("EMAIL SERVICE: Resend failed");
    console.error("RESEND ERROR:", error);

    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
};