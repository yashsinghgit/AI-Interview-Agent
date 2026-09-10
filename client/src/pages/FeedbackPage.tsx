import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../services/api";

interface FinalReport {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

function FeedbackPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Invalid interview ID.");
      setLoading(false);
      return;
    }

    const loadReport = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/interviews/${id}`);

        const report = response.data?.interview?.finalReport;

        if (!report) {
          setError("No Interview Report Found");
          return;
        }

        setFinalReport(report);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;

        console.error("Failed to load interview report:", err);

        setError(
          axiosError.response?.data?.message ||
            "Failed to load interview report.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">
            Preparing Your Feedback...
          </h1>

          <p className="text-gray-500">
            Loading your AI-generated interview report.
          </p>
        </div>
      </div>
    );
  }

  // Error / missing report state
  if (error || !finalReport) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {error || "No Interview Report Found"}
          </h1>

          <p className="text-gray-500 mb-6">
            Complete an interview to view your feedback.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Report state
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-4xl font-bold text-center mb-2">
          🎉 Interview Completed
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Here's your AI-generated interview summary.
        </p>

        {/* Overall Score */}
        <div className="text-center mb-10">
          <h2 className="text-xl text-gray-500">
            Overall Score
          </h2>

          <p className="text-6xl font-bold text-blue-600 mt-2">
            {finalReport.overallScore}/100
          </p>
        </div>

        {/* Strengths */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3">
            ✅ Strengths
          </h3>

          <ul className="list-disc ml-6 space-y-2">
            {finalReport.strengths.map(
              (strength: string, index: number) => (
                <li key={index}>{strength}</li>
              )
            )}
          </ul>
        </div>

        {/* Areas to Improve */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3">
            📈 Areas to Improve
          </h3>

          <ul className="list-disc ml-6 space-y-2">
            {finalReport.weaknesses.map(
              (weakness: string, index: number) => (
                <li key={index}>{weakness}</li>
              )
            )}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-3">
            💡 Recommendations
          </h3>

          <ul className="list-disc ml-6 space-y-2">
            {finalReport.recommendations.map(
              (recommendation: string, index: number) => (
                <li key={index}>{recommendation}</li>
              )
            )}
          </ul>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}

export default FeedbackPage;