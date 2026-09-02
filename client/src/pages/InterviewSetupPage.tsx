import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function InterviewSetupPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
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
    } catch (error: any) {
      console.error("CREATE INTERVIEW ERROR:", error);

      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);

      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to create interview.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-10">
        <h1 className="text-4xl font-bold text-center">
          Create Your AI Interview
        </h1>

        <p className="text-gray-500 text-center mt-2">
          Customize your interview before you begin.
        </p>

        <div className="mt-8">
          <label className="block font-semibold mb-2">Job Role</label>

          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Frontend Developer"
            className="w-full border rounded-lg p-3 mb-6"
          />

          <label className="block font-semibold mb-2">Difficulty</label>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full border rounded-lg p-3 mb-6"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <label className="block font-semibold mb-2">Job Description</label>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            rows={6}
            className="w-full border rounded-lg p-3 mb-6 resize-none"
          />

          <label className="block font-semibold mb-2">Resume</label>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here (optional)..."
            rows={6}
            className="w-full border rounded-lg p-3 mb-8 resize-none"
          />

          <button
            onClick={handleCreateInterview}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400"
          >
            {loading ? "Creating Interview..." : "Create Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewSetupPage;
