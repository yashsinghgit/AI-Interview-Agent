import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../services/api";

interface InterviewQuestion {
  number: number;
  question: string;
  category?: string;
  topic?: string;
  reason?: string;
  decision?: "follow_up" | "new_topic";
}

interface Evaluation {
  score: number;
  evaluation: string;
  strengths: string[];
  weaknesses: string[];
}

function InterviewPage() {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const [question, setQuestion] = useState<InterviewQuestion | null>(null);

  const [answer, setAnswer] = useState("");

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const [error, setError] = useState("");

  // ============================================================
  // TIMER
  // ============================================================

  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Prevent React StrictMode from requesting the first
  // question twice during development.
  const questionLoaded = useRef(false);

  // ============================================================
  //  LOAD FIRST AI QUESTION
  // ============================================================

  useEffect(() => {
    if (!id || questionLoaded.current) {
      return;
    }

    questionLoaded.current = true;

    const loadFirstQuestion = async () => {
      try {
        setLoadingQuestion(true);
        setError("");

        const response = await api.post(`/interviews/${id}/question`);

        setQuestion(response.data.question);
      } catch (err) {
        const axiosError = err as AxiosError<{
          message?: string;
        }>;

        console.error("Failed to load question:", err);

        setError(
          axiosError.response?.data?.message ||
            "Failed to load interview question.",
        );
      } finally {
        setLoadingQuestion(false);
      }
    };

    loadFirstQuestion();
  }, [id]);

  // ============================================================
  // TIMER
  // ============================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 0) {
          clearInterval(timer);
          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // FORMAT TIMER
  // ============================================================

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  // ============================================================
  // 🔥 UPDATE 4: SUBMIT ANSWER TO BACKEND
  // ============================================================

  const handleSubmitAnswer = async () => {
    if (!id || !question) {
      return;
    }

    if (!answer.trim()) {
      alert("Please answer the question before proceeding.");
      return;
    }

    try {
      setSubmittingAnswer(true);
      setError("");

      const response = await api.post(`/interviews/${id}/answer`, {
        answer: answer.trim(),
      });

      // Save evaluation returned by backend
      setEvaluation(response.data.evaluation);

      // ========================================================
      // 🔥 UPDATE 5: CHECK IF INTERVIEW IS COMPLETED
      // ========================================================

      if (response.data.finalReport) {
        navigate("/feedback", {
          state: {
            interviewId: id,
            finalReport: response.data.finalReport,
          },
        });

        return;
      }

      // ========================================================
      // 🔥 UPDATE 6: DISPLAY NEXT QUESTION
      // ========================================================

      if (response.data.question) {
        setQuestion(response.data.question);

        // Clear previous answer for the new question
        setAnswer("");
      }
    } catch (err) {
      const axiosError = err as AxiosError<{
        message?: string;
      }>;

      console.error("Failed to submit answer:", err);

      alert(axiosError.response?.data?.message || "Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // ============================================================
  // 🔥 UPDATE 7: COMPLETE INTERVIEW MANUALLY
  // ============================================================

  const handleFinish = async () => {
    if (!id) {
      return;
    }

    try {
      setSubmittingAnswer(true);

      const response = await api.patch(`/interviews/${id}/complete`);

      navigate("/feedback", {
        state: {
          interviewId: id,
          finalReport: response.data.interview.finalReport,
        },
      });
    } catch (err) {
      const axiosError = err as AxiosError<{
        message?: string;
      }>;

      console.error("Failed to complete interview:", err);

      alert(
        axiosError.response?.data?.message ||
          "You need to complete the minimum number of questions before finishing.",
      );
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loadingQuestion) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
          <div className="text-4xl mb-4">🤖</div>

          <h1 className="text-2xl font-bold">Preparing Your Interview</h1>

          <p className="text-gray-500 mt-2">
            AI is generating your first question...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR SCREEN
  // ============================================================

  if (error || !question) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>

          <h1 className="text-2xl font-bold">Unable to Load Interview</h1>

          <p className="text-red-500 mt-3">
            {error || "Question could not be loaded."}
          </p>

          <button
            onClick={() => navigate("/Dashboard")}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN INTERVIEW UI
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">AI Mock Interview</h1>

            <p className="text-sm text-gray-500">Question {question.number}</p>
          </div>

          <div className="text-lg font-semibold">
            ⏱️ {minutes}:{seconds}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* QUESTION CARD */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">
              Question {question.number}
            </span>

            {question.category && (
              <span className="text-sm text-gray-500">{question.category}</span>
            )}
          </div>

          {/* 🔥 REAL AI QUESTION */}
          <h2 className="text-2xl font-bold leading-relaxed">
            {question.question}
          </h2>

          {question.topic && (
            <p className="text-sm text-gray-500 mt-3">
              Topic: {question.topic}
            </p>
          )}

          {/* ANSWER */}
          <div className="mt-8">
            <label className="block font-semibold mb-3">Your Answer</label>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={10}
              className="w-full border border-gray-300 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submittingAnswer}
            />

            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-500">
                {answer.length} characters
              </span>

              <span className="text-sm text-gray-500">
                Take your time and explain clearly.
              </span>
            </div>
          </div>

          {/* SUBMIT */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmitAnswer}
              disabled={submittingAnswer || !answer.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold"
            >
              {submittingAnswer ? "Evaluating..." : "Submit Answer →"}
            </button>
          </div>
        </div>

        {/* =====================================================
            🔥 UPDATE 8: SHOW EVALUATION
            ===================================================== */}

        {evaluation && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-bold mb-6">🤖 AI Evaluation</h2>

            <div className="mb-6">
              <span className="text-gray-500">Score</span>

              <div className="text-4xl font-bold text-blue-600 mt-1">
                {evaluation.score}/100
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">Evaluation</h3>

              <p className="text-gray-700 leading-relaxed">
                {evaluation.evaluation}
              </p>
            </div>

            {evaluation.strengths?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">✅ Strengths</h3>

                <ul className="list-disc pl-6 text-gray-700">
                  {evaluation.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.weaknesses?.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  ⚠️ Areas to Improve
                </h3>

                <ul className="list-disc pl-6 text-gray-700">
                  {evaluation.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* FINISH */}
        {question.number >= 15 && (
          <div className="mt-8 text-center">
            <button
              onClick={handleFinish}
              disabled={submittingAnswer}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Finish Interview
            </button>

            <p className="text-sm text-gray-500 mt-2">
              You have completed the minimum 15 questions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default InterviewPage;
