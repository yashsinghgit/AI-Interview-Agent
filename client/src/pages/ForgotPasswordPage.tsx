import React, { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { AxiosError } from "axios";
import api from "../services/api";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await api.post("/forgot-password", {
        email: email.trim(),
      });

      setSuccessMessage(
        response.data.message ||
          "If an account with that email exists, a password reset link has been sent."
      );
    } catch (err) {
      console.error("Forgot password error:", err);
      const axiosError = err as AxiosError<{ message?: string }>;
      setErrorMessage(
        axiosError.response?.data?.message ||
          "Unable to process your request. Please try again later."
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
              <KeyRound size={23} className="text-blue-600" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Reset Your Password
            </h1>

            <p className="mt-2 text-gray-500">
              Enter your account email and we will send you a password reset link.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 md:p-8">
            {successMessage ? (
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Check Your Email
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {successMessage}
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessMessage("");
                      setEmail("");
                    }}
                    className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Resend to a different email
                  </button>

                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
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

export default ForgotPasswordPage;
