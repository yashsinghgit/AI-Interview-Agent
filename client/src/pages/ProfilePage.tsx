import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  ArrowLeft,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import api from "../services/api";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
};

function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/profile");

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setError("Unable to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>

            <span className="text-xl font-bold text-gray-900">
              InterviewAI
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Heading */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <User size={24} className="text-blue-600" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Profile
                </h1>

                <p className="text-gray-500 mt-1">
                  Manage your account information.
                </p>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10">
              <div className="flex flex-col items-center justify-center">
                <Loader2
                  size={28}
                  className="text-blue-600 animate-spin"
                />

                <p className="text-sm text-gray-500 mt-4">
                  Loading your profile...
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Profile Card */}
          {!loading && !error && user && (
            <>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Profile Header */}
                <div className="px-6 py-6 md:px-8 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <User size={30} className="text-blue-600" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {user.name}
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Your InterviewAI account details
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="p-6 md:p-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-5">
                    Account Information
                  </h3>

                  {/* Name */}
                  <div className="flex items-center gap-4 py-4 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <User size={19} className="text-gray-500" />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Name
                      </p>

                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {user.name}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Mail size={19} className="text-gray-500" />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Email
                      </p>

                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <ShieldCheck
                      size={20}
                      className="text-green-600"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Account Status
                    </p>

                    <p className="text-sm text-green-600 mt-0.5">
                      Your account is active
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Back */}
          <div className="flex justify-center mt-7">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;