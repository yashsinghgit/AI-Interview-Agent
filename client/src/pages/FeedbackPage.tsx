import { useNavigate } from "react-router-dom";

function FeedbackPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-4xl font-bold text-center mb-2">
          🎉 Interview Completed
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Here's your interview summary.
        </p>

        <div className="text-center mb-10">
          <h2 className="text-xl text-gray-500">
            Overall Score
          </h2>

          <p className="text-6xl font-bold text-blue-600 mt-2">
            85/100
          </p>
        </div>

        <div className="space-y-4 mb-10">

          <div className="flex justify-between">
            <span>Communication</span>
            <span>⭐⭐⭐⭐☆</span>
          </div>

          <div className="flex justify-between">
            <span>Technical Skills</span>
            <span>⭐⭐⭐⭐⭐</span>
          </div>

          <div className="flex justify-between">
            <span>Confidence</span>
            <span>⭐⭐⭐☆☆</span>
          </div>

          <div className="flex justify-between">
            <span>Problem Solving</span>
            <span>⭐⭐⭐⭐☆</span>
          </div>

        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3">
            ✅ Strengths
          </h3>

          <ul className="list-disc ml-6 space-y-2">
            <li>Good communication skills</li>
            <li>Strong technical knowledge</li>
            <li>Clear problem-solving approach</li>
          </ul>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-3">
            📈 Areas to Improve
          </h3>

          <ul className="list-disc ml-6 space-y-2">
            <li>Give more real-world examples</li>
            <li>Speak more confidently</li>
            <li>Structure answers better</li>
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