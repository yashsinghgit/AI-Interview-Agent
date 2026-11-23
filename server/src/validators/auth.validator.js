const { z } = require("zod");

const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(100, "Name must not exceed 100 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .max(255, "Email must not exceed 255 characters"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters long")
      .max(128, "Password must not exceed 128 characters"),
  })
  .strict();

const loginSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .max(255, "Email must not exceed 255 characters"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .max(128, "Password must not exceed 128 characters"),
  })
  .strict();

const resendVerificationSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .max(255, "Email must not exceed 255 characters"),
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .max(255, "Email must not exceed 255 characters"),
  })
  .strict();

const resetPasswordBodySchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(10, "Token is too short")
      .max(256, "Token is too long")
      .optional(),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters long")
      .max(128, "Password must not exceed 128 characters"),
  })
  .strict();

const tokenParamSchema = z
  .object({
    token: z
      .string({ required_error: "Token is required" })
      .trim()
      .min(10, "Token must be at least 10 characters long")
      .max(256, "Token must not exceed 256 characters"),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordBodySchema,
  tokenParamSchema,
};
