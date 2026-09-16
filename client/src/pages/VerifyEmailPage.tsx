import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "../services/api";

function VerifyEmailPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const verificationStarted = useRef(false);

  useEffect(() => {
    async function verifyEmail() {

      if(verificationStarted.current) return;
      verificationStarted.current = true;

      localStorage.removeItem("token"); // Clear any existing token on email verification

      try {
        const response = await api.get(`/verify-email/${token}`);

        setSuccess(true);
        setMessage(response.data.message);
      } catch (error: any) {
        setSuccess(false);
        setMessage(
          error.response?.data?.message ||
            "Unable to verify your email"
        );
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      verifyEmail();
    } else {
      setLoading(false);
      setMessage("Invalid verification link");
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600" />

          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Verifying your email...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        {success ? (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Email Verified!
            </h1>

            <p className="mt-3 text-gray-600">
              {message}
            </p>

            <Link
              to="/login"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 mx-auto text-red-500" />

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Verification Failed
            </h1>

            <p className="mt-3 text-gray-600">
              {message}
            </p>

            <Link
              to="/login"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;