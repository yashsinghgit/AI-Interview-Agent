import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import Navbar from "../components/Navbar";
import api from "../services/api";
import {User} from "lucide-react";

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

  const totalInterviews = interviews.length;

  const completedInterviews = interviews.filter(
    (interview) => interview.status === "completed",
  ).length;

  const inProgressInterviews = interviews.filter(
    (interview) => interview.status === "in-progress",
  ).length;

  const scoredInterviews = interviews.filter(
    (interview) => interview.status === "completed" && interview.finalReport,
  );

  const averageScore =
    scoredInterviews.length > 0
      ? Math.round(
          scoredInterviews.reduce(
            (total, interview) =>
              total + (interview.finalReport?.overallScore || 0),
            0,
          ) / scoredInterviews.length,
        )
      : 0;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8 md:py-10">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Welcome Back 👋
              </h1>

              <p className="text-gray-500 mt-2">
                Ready to ace your next interview?
              </p>
            </div>

            <button
              onClick={() => navigate("/interview/setup")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              + Start New Interview
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
            {/* Total Interviews */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-500">
                Total Interviews
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalInterviews}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                All interview sessions
              </p>
            </div>

            {/* Completed */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-500">Completed</p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {completedInterviews}
              </p>

              <p className="text-xs text-gray-400 mt-2">Finished interviews</p>
            </div>

            {/* In Progress */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-500">In Progress</p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {inProgressInterviews}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Interviews to continue
              </p>
            </div>

            {/* Average Score */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-500">Average Score</p>

              <p className="text-3xl font-bold text-blue-600 mt-2">
                {averageScore}
                <span className="text-lg text-gray-400">/100</span>
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Across completed interviews
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <section className="mb-10">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>

              <p className="text-sm text-gray-500 mt-1">
                Jump back into your interview preparation.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Resume */}
              <button
                onClick={() => navigate("/resume")}
                className="text-left bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-lg">📄</span>
                </div>

                <h3 className="font-bold text-gray-900">Manage Resume</h3>

                <p className="text-sm text-gray-500 mt-1">
                  Upload or update your resume for personalized interviews.
                </p>
              </button>

              {/* History */}
              <button
                onClick={() =>
                  document.getElementById("interview-history")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="text-left bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <span className="text-blue-600 text-lg">📊</span>
                </div>

                <h3 className="font-bold text-gray-900">Interview History</h3>

                <p className="text-sm text-gray-500 mt-1">
                  Review your previous interview sessions and scores.
                </p>
              </button>

              {/* Profile */}
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                  <User size={22} className="text-blue-600" />
                </div>

                <h3 className="text-lg font-bold text-gray-900">Profile</h3>

                <p className="text-sm text-gray-500 mt-2">
                  Manage your account information.
                </p>
              </button>
            </div>
          </section>

          {/* Interview History */}
          <section id="interview-history">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Interviews
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Review your previous interview sessions.
                </p>
              </div>

              <button
                onClick={() => navigate("/interview/setup")}
                className="border border-gray-300 bg-white text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                + New Interview
              </button>
            </div>

            {/* Loading */}
            {loadingInterviews && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
                <p className="text-gray-500">Loading your interviews...</p>
              </div>
            )}

            {/* Error */}
            {!loadingInterviews && error && (
              <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loadingInterviews && !error && interviews.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-5">
                  <span className="text-2xl">🎤</span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No interviews yet
                </h3>

                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start your first AI mock interview and your results will
                  appear here.
                </p>

                <button
                  onClick={() => navigate("/interview/setup")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Start Your First Interview
                </button>
              </div>
            )}

            {/* Interview List */}
            {!loadingInterviews && !error && interviews.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.8fr_1fr] gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Role</span>
                  <span>Date</span>
                  <span>Status</span>
                  <span className="text-right">Action</span>
                </div>

                {interviews.map((interview) => (
                  <div
                    key={interview._id}
                    className="grid md:grid-cols-[1.5fr_1fr_0.8fr_1fr] gap-4 items-center px-6 py-5 border-b border-gray-100 last:border-b-0"
                  >
                    {/* Role */}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {interview.role || "AI Mock Interview"}
                      </h3>

                      <p className="text-xs text-gray-400 mt-1 md:hidden">
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Date */}
                    <p className="hidden md:block text-sm text-gray-500">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </p>

                    {/* Status */}
                    <div>
                      {interview.status === "completed" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
                          In Progress
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      {interview.status === "completed" &&
                      interview.finalReport ? (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Score</p>

                            <p className="text-lg font-bold text-blue-600">
                              {interview.finalReport.overallScore}
                              /100
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              navigate(`/feedback/${interview._id}`)
                            }
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                          >
                            View Report
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            navigate(`/interview/${interview._id}`)
                          }
                          className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                        >
                          Continue →
                        </button>
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
