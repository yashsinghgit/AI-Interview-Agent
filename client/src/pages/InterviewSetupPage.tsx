import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Briefcase, FileText, Sparkles, ArrowRight, X } from "lucide-react";
import { AxiosError } from "axios";
import api from "../services/api";

function InterviewSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [jobDescription, setJobDescription] = useState("");

  // Retrieve resumeText purely from in-memory navigation state (never localStorage)
  const [resumeText, setResumeText] = useState<string>(() => {
    const navState = location.state as { resumeText?: string } | null;
    return navState?.resumeText || "";
  });

  // Purge any legacy plaintext resume stored in localStorage on mount
  useEffect(() => {
    localStorage.removeItem("resumeText");
  }, []);

  const [loading, setLoading] = useState(false);

  const handleCreateInterview = async () => {
    if (!role || !jobDescription) {
      alert("Please enter the role and job description.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/interviews", {
        role,
        difficulty,
        jobDescription,
        resumeText,
      });

      const interviewId = response.data.interview._id;

      navigate(`/interview/${interviewId}`);
    } catch (error: unknown) {
      console.error("CREATE INTERVIEW ERROR:", error);
      const axiosError = error as AxiosError<{ message?: string }>;

      alert(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "Failed to create interview.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <button
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
            onClick={() => navigate("/dashboard")}
            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
              <Sparkles size={23} className="text-blue-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Create Your AI Interview
            </h1>

            <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
              Customize your interview with your target role, job description,
              difficulty, and resume.
            </p>
          </div>

          {/* Setup Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
            {/* Job Role */}
            <div className="mb-6">
              <label
                htmlFor="role"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
              >
                <Briefcase size={17} className="text-blue-600" />
                Job Role
              </label>

              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label
                htmlFor="difficulty"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Difficulty
              </label>

              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <p className="text-xs text-gray-400 mt-2">
                Choose the level that best matches your preparation needs.
              </p>
            </div>

            {/* Job Description */}
            <div className="mb-6">
              <label
                htmlFor="jobDescription"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
              >
                <FileText size={17} className="text-blue-600" />
                Job Description
              </label>

              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={7}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 leading-relaxed resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />

              <p className="text-xs text-gray-400 mt-2">
                The AI will use this to tailor questions to the role.
              </p>
            </div>

            {/* Resume */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="resumeText"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                >
                  <FileText size={17} className="text-blue-600" />
                  Resume (Optional)
                </label>

                <div className="flex items-center gap-3">
                  {resumeText && (
                    <>
                      <span className="text-xs font-semibold text-green-600">
                        ✓ In Memory
                      </span>
                      <button
                        type="button"
                        onClick={() => setResumeText("")}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <X size={12} />
                        Clear
                      </button>
                    </>
                  )}
                  <span className="text-xs text-gray-400">
                    {resumeText.length.toLocaleString()}/50,000
                  </span>
                </div>
              </div>

              <textarea
                id="resumeText"
                value={resumeText}
                maxLength={50000}
                onChange={(e) => {
                  setResumeText(e.target.value);
                }}
                placeholder="Paste your resume text here or upload a resume from the Resume page..."
                rows={7}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 leading-relaxed resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />

              <p className="text-xs text-gray-400 mt-2">
                Your resume text stays in memory and is securely submitted with your interview to personalize questions.
              </p>
            </div>

            {/* Create Interview */}
            <button
              type="button"
              onClick={handleCreateInterview}
              disabled={loading}
              className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Creating Interview..." : "Create Interview"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </div>

          {/* Info */}
          <div className="mt-5 text-center">
            <p className="text-xs text-gray-400">
              Your interview will be personalized using the information
              provided above.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InterviewSetupPage;