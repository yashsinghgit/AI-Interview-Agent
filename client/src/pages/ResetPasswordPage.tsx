import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import api from "../services/api";

function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setErrorMessage("Reset token is missing or invalid.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      await api.post(`/reset-password/${token}`, {
        password,
      });

      setSuccess(true);
    } catch (err) {
      console.error("Reset password error:", err);
      const axiosError = err as AxiosError<{ message?: string }>;
      setErrorMessage(
        axiosError.response?.data?.message ||
          "Failed to reset password. The link may have expired or is invalid."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto w-full px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">InterviewAI</span>
          </Link>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock size={23} className="text-blue-600" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Set New Password
            </h1>

            <p className="mt-2 text-gray-500">
              Please enter and confirm your new account password.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 md:p-8">
            {success ? (
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Password Reset Successfully!
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  Your password has been updated and any existing sessions have been invalidated.
                  You can now log in securely with your new password.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>

                    {errorMessage.toLowerCase().includes("expired") && (
                      <div className="pt-1">
                        <Link
                          to="/forgot-password"
                          className="text-xs font-semibold text-red-800 underline hover:text-red-900"
                        >
                          Request a new password reset link →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ResetPasswordPage;
