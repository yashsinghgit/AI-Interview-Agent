import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import DashboardCard from "../components/DashboardCard";
import Navbar from "../components/Navbar";
import api from "../services/api";

interface Interview {
  _id: string;
  role?: string;
  status: "in-progress" | "completed";
  currentQuestion?: number;
  createdAt: string;
  finalReport?: {
    overallScore: number;
  };
}

function DashboardPage() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInterviews = async () => {
      try {
        setLoadingInterviews(true);
        setError("");

        const response = await api.get("/interviews");

        setInterviews(response.data.interviews || []);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;

        console.error("Failed to load interviews:", err);

        setError(
          axiosError.response?.data?.message ||
            "Failed to load interview history.",
        );
      } finally {
        setLoadingInterviews(false);
      }
    };

    loadInterviews();
  }, []);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {/* Header */}
          <h1 className="text-4xl font-bold">Welcome Back 👋</h1>

          <p className="text-gray-500 mt-2">
            Ready to ace your next interview
          </p>

          {/* Dashboard Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            <DashboardCard
              icon="🎤"
              title="Start Interview"
              description="Begin an AI mock interview."
              onClick={() => navigate("/interview/setup")}
            />

            <DashboardCard
              icon="📄"
              title="Upload Resume"
              description="Upload your resume for personalized interviews."
              onClick={() => navigate("/resume")}
            />

            <DashboardCard
              icon="📊"
              title="Interview History"
              description="Review your previous interview sessions."
              onClick={() => {
                document
                  .getElementById("interview-history")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            />

            <DashboardCard
              icon="👤"
              title="Profile"
              description="Manage your account information."
              onClick={() => navigate("/profile")}
            />
          </div>

          {/* Interview History */}
          <section id="interview-history" className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Recent Interviews
                </h2>

                <p className="text-gray-500 mt-1">
                  Review your previous interview sessions.
                </p>
              </div>

              <button
                onClick={() => navigate("/interview/setup")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
              >
                + New Interview
              </button>
            </div>

            {/* Loading */}
            {loadingInterviews && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-500">
                  Loading your interviews...
                </p>
              </div>
            )}

            {/* Error */}
            {!loadingInterviews && error && (
              <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingInterviews &&
              !error &&
              interviews.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                  <div className="text-4xl mb-4">🎤</div>

                  <h3 className="text-xl font-semibold mb-2">
                    No interviews yet
                  </h3>

                  <p className="text-gray-500 mb-6">
                    Start your first AI mock interview and see your
                    results here.
                  </p>

                  <button
                    onClick={() => navigate("/interview/setup")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Start Your First Interview
                  </button>
                </div>
              )}

            {/* Interview List */}
            {!loadingInterviews &&
              !error &&
              interviews.length > 0 && (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div
                      key={interview._id}
                      className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
                    >
                      <div>
                        <h3 className="text-lg font-semibold">
                          {interview.role || "AI Mock Interview"}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(
                            interview.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {interview.status === "completed" &&
                        interview.finalReport ? (
                          <>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                Score
                              </p>

                              <p className="text-2xl font-bold text-blue-600">
                                {interview.finalReport.overallScore}/100
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                navigate(
                                  `/feedback/${interview._id}`,
                                )
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
                            >
                              View Report
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-yellow-600">
                              In Progress
                            </span>

                            <button
                              onClick={() =>
                                navigate(
                                  `/interview/${interview._id}`,
                                )
                              }
                              className="border border-gray-300 hover:bg-gray-50 px-5 py-2.5 rounded-lg font-medium"
                            >
                              Continue
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>
        </div>
      </main>
    </>
  );
}

export default DashboardPage;