import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { toast } from "sonner";

import Navbar from "../components/Navbar";
import api from "../services/api";
import { useDelayedLoading } from "../hooks/useDelayedLoading";
import { DashboardSkeleton } from "../components/AppSkeletons";
import { User, MoreVertical, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface DashboardStats {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  averageScore: number;
}

function DashboardPage() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [error, setError] = useState("");

  const { showSkeleton: showDashboardSkeleton } = useDelayedLoading(loadingInterviews, {
    delay: 300,
    timeout: 15000,
    timeoutMessage: "This is taking longer than expected",
    retryAction: () => loadInterviews(page),
  });
  const [page, setPage] = useState(1);
  const limit = 10;
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    completedInterviews: 0,
    inProgressInterviews: 0,
    averageScore: 0,
  });

  const loadInterviews = async (targetPage: number = page) => {
    try {
      setLoadingInterviews(true);
      setError("");

      const response = await api.get("/interviews", {
        params: { page: targetPage, limit },
      });

      const data = response.data;
      setInterviews(data.interviews || []);

      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        const total = (data.interviews || []).length;
        setPagination({
          total,
          page: targetPage,
          limit,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        });
      }

      if (data.stats) {
        setStats(data.stats);
      } else {
        const items: Interview[] = data.interviews || [];
        const completed = items.filter((i) => i.status === "completed").length;
        const inProgress = items.filter((i) => i.status === "in-progress").length;
        const scored = items.filter(
          (i) => i.status === "completed" && i.finalReport
        );
        const avg =
          scored.length > 0
            ? Math.round(
                scored.reduce(
                  (total, interview) =>
                    total + (interview.finalReport?.overallScore || 0),
                  0
                ) / scored.length
              )
            : 0;
        setStats({
          totalInterviews: items.length,
          completedInterviews: completed,
          inProgressInterviews: inProgress,
          averageScore: avg,
        });
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error("Failed to load interviews:", err);
      setError(
        axiosError.response?.data?.message || "Failed to load interview history."
      );
    } finally {
      setLoadingInterviews(false);
    }
  };

  useEffect(() => {
    loadInterviews(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const pendingDeletionsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Close overflow menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-overflow-menu]")) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const pending = pendingDeletionsRef.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const handleDeleteInterview = (interviewId: string) => {
    setOpenMenuId(null);
    const itemToDelete = interviews.find((item) => item._id === interviewId);
    if (!itemToDelete) return;

    // Immediately remove from the list
    setInterviews((prev) => prev.filter((item) => item._id !== interviewId));

    // Schedule API call in 6 seconds
    const timer = setTimeout(async () => {
      pendingDeletionsRef.current.delete(interviewId);
      try {
        await api.delete(`/interviews/${interviewId}`);
        // Refresh page stats if last item deleted
        if (interviews.length <= 1 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          loadInterviews(page);
        }
      } catch (err) {
        console.error("Failed to delete interview:", err);
        const axiosError = err as AxiosError<{ message?: string }>;
        const reason =
          axiosError.response?.data?.message || "Failed to delete interview.";
        toast.error(reason, {
          duration: 6000,
          action: {
            label: "Retry",
            onClick: () => handleDeleteInterview(interviewId),
          },
        });
        // Restore item on failure
        setInterviews((prev) => [itemToDelete, ...prev]);
      }
    }, 6000);

    pendingDeletionsRef.current.set(interviewId, timer);

    // Show toast with Undo action
    toast("Interview deleted", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          const activeTimer = pendingDeletionsRef.current.get(interviewId);
          if (activeTimer) {
            clearTimeout(activeTimer);
            pendingDeletionsRef.current.delete(interviewId);
          }
          // Restore immediately to the list
          setInterviews((prev) => [itemToDelete, ...prev]);
        },
      },
    });
  };

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

          {/* Stats or Skeleton */}
          {loadingInterviews && showDashboardSkeleton ? (
            <div className="mb-10">
              <DashboardSkeleton />
            </div>
          ) : (
            /* Stats */
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {/* Total Interviews */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <p className="text-sm font-medium text-gray-500">
                  Total Interviews
                </p>

                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalInterviews}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  All interview sessions
                </p>
              </div>

              {/* Completed */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <p className="text-sm font-medium text-gray-500">Completed</p>

                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.completedInterviews}
                </p>

                <p className="text-xs text-gray-400 mt-2">Finished interviews</p>
              </div>

              {/* In Progress */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <p className="text-sm font-medium text-gray-500">In Progress</p>

                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.inProgressInterviews}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  Interviews to continue
                </p>
              </div>

              {/* Average Score */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <p className="text-sm font-medium text-gray-500">Average Score</p>

                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.averageScore}
                  <span className="text-lg text-gray-400">/100</span>
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  Across completed interviews
                </p>
              </div>
            </div>
          )}

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
            {loadingInterviews && !showDashboardSkeleton && (
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

                      {/* Overflow Menu with Delete Action */}
                      <div className="relative" data-overflow-menu>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) =>
                              prev === interview._id ? null : interview._id
                            );
                          }}
                          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
                          title="More options"
                          aria-label="More options"
                          aria-haspopup="true"
                          aria-expanded={openMenuId === interview._id}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === interview._id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-md py-1 z-20 font-sans">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInterview(interview._id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--destructive)] hover:bg-[var(--muted)] transition text-left"
                            >
                              <Trash2 size={13} />
                              Delete interview
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Showing{" "}
                      <span className="font-semibold text-gray-900">
                        {(page - 1) * limit + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-gray-900">
                        {Math.min(page * limit, pagination.total)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-gray-900">
                        {pagination.total}
                      </span>{" "}
                      interviews
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrevPage || loadingInterviews}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: pagination.totalPages },
                          (_, i) => i + 1
                        ).map((pageNum) => {
                          if (
                            pagination.totalPages > 6 &&
                            Math.abs(pageNum - page) > 1 &&
                            pageNum !== 1 &&
                            pageNum !== pagination.totalPages
                          ) {
                            if (
                              pageNum === 2 ||
                              pageNum === pagination.totalPages - 1
                            ) {
                              return (
                                <span
                                  key={pageNum}
                                  className="px-2 text-sm text-gray-400 select-none"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }

                          const isActive = pageNum === page;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setPage(pageNum)}
                              disabled={loadingInterviews}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                                isActive
                                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                                  : "text-gray-700 hover:bg-gray-100 bg-white border border-gray-300"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPage((p) => Math.min(pagination.totalPages, p + 1))
                        }
                        disabled={!pagination.hasNextPage || loadingInterviews}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default DashboardPage;
