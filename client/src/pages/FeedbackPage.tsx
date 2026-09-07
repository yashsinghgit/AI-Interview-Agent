import { useLocation, useNavigate } from "react-router-dom";

function FeedbackPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const finalReport = location.state?.finalReport;

  // Handle missing report
  if (!finalReport) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">
            No Interview Report Found
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

  // Display final interview report
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-4xl font-bold text-center mb-2">
          🎉 Interview Completed
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Here's your AI-generated interview summary.
        </p>

        <div className="text-center mb-10">
          <h2 className="text-xl text-gray-500">
            Overall Score
          </h2>

          <p className="text-6xl font-bold text-blue-600 mt-2">
            {finalReport.overallScore}/100
          </p>
        </div>

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