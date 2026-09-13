import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-5 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Preparing Your Feedback
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
            <TrendingUp size={26} className="text-gray-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {error || "No Interview Report Found"}
          </h1>

          <p className="text-gray-500 mb-7">
            Complete an interview to view your feedback.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-sm"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const score = finalReport.overallScore;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition"
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 md:py-12">
        {/* Page Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-600 text-sm font-semibold mb-4">
            <CheckCircle2 size={16} />
            Interview Completed
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Your Interview Feedback
          </h1>

          <p className="mt-3 text-gray-500">
            Here's your AI-generated performance summary.
          </p>
        </div>

        {/* Overall Score */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 md:p-10 mb-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Overall Score
            </p>

            <div className="mt-4 flex items-end justify-center gap-2">
              <span className="text-6xl md:text-7xl font-bold text-blue-600">
                {score}
              </span>

              <span className="text-2xl font-semibold text-gray-400 mb-2">
                /100
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Based on your overall interview performance
            </p>
          </div>
        </section>

        {/* Strengths */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-7 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={21} className="text-green-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Strengths
              </h2>

              <p className="text-sm text-gray-500">
                What you did well
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {finalReport.strengths.map(
              (strength: string, index: number) => (
                <div
                  key={index}
                  className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <CheckCircle2
                    size={19}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />

                  <p className="text-gray-700 leading-relaxed">
                    {strength}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        {/* Areas to Improve */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-7 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <TrendingUp size={21} className="text-yellow-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Areas to Improve
              </h2>

              <p className="text-sm text-gray-500">
                Where you can improve
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {finalReport.weaknesses.map(
              (weakness: string, index: number) => (
                <div
                  key={index}
                  className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2.5 flex-shrink-0" />

                  <p className="text-gray-700 leading-relaxed">
                    {weakness}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        {/* Recommendations */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-7 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Lightbulb size={21} className="text-blue-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recommendations
              </h2>

              <p className="text-sm text-gray-500">
                How to perform better next time
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {finalReport.recommendations.map(
              (recommendation: string, index: number) => (
                <div
                  key={index}
                  className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>

                  <p className="text-gray-700 leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        {/* Bottom Action */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-sm"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <button
            onClick={() => navigate("/interview/setup")}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition"
          >
            Start Another Interview
          </button>
        </div>
      </main>
    </div>
  );
}

export default FeedbackPage;