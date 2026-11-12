const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../services/email.services");

const registerUser = async (req, res, next) => {
  try {
    // 1. Get data from the request
    const { name, email, password } = req.body;

    // 2. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check whether the email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // 3a. If user is already verified, reject registration with 409
      if (existingUser.isVerified) {
        return res.status(409).json({
          message: "An account with this email already exists. Please log in.",
        });
      }

      // 3b. Existing unverified account: refresh token and re-attempt email delivery without modifying credentials
      const verificationToken = crypto.randomBytes(32).toString("hex");
      existingUser.verificationToken = verificationToken;
      existingUser.verificationTokenExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );
      await existingUser.save();

      let emailSent = false;
      try {
        await sendVerificationEmail(existingUser.email, verificationToken);
        emailSent = true;
      } catch (emailErr) {
        console.error("Failed to send verification email to existing unverified user:", emailErr.message);
      }

      return res.status(200).json({
        message: emailSent
          ? "An unverified account with this email already exists. A new verification email has been sent."
          : "An unverified account with this email already exists, but verification email delivery is pending. Please try resending verification later.",
        emailSent,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
        },
      });
    }

    // 4. Create new user
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await user.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        return res.status(409).json({
          message: "An account with this email already exists.",
        });
      }
      throw saveError;
    }

    // 5. Send verification email (retaining the unverified account if email sending fails)
    let emailSent = false;
    try {
      await sendVerificationEmail(user.email, verificationToken);
      emailSent = true;
    } catch (emailErr) {
      console.error("Failed to send verification email during registration:", emailErr.message);
    }

    // 6. Return response accurately reflecting email delivery status
    return res.status(201).json({
      message: emailSent
        ? "Registration successful! Please check your email to verify your account."
        : "Account created successfully, but verification email delivery is pending. Please click resend verification on the login page.",
      emailSent,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = JWT.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token: token,
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        message: "Verification token is required",
      });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }, // Check if token is not expired
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    let emailSent = false;
    try {
      await sendVerificationEmail(user.email, verificationToken);
      emailSent = true;
    } catch (emailErr) {
      console.error("Failed to resend verification email:", emailErr.message);
      return res.status(502).json({
        message: "Unable to send verification email at this time. Please try again later.",
        emailSent: false,
      });
    }

    return res.status(200).json({
      message: "Verification email sent successfully",
      emailSent: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
};
