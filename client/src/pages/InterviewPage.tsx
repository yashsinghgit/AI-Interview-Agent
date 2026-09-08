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
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

  const questionLoaded = useRef(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  if (timeLeft !== 0 || !id) {
    return;
  }

  const autoCompleteInterview = async () => {
    try {
      setSubmittingAnswer(true);
      setError("");

      const response = await api.patch(`/interviews/${id}/complete`, {
  timedOut: true,
});

      navigate("/feedback", {
        state: {
          interviewId: id,
          finalReport : response.data?.interview?.finalReport,
        },
      });
    } catch (error) {
      const axiosError = error as AxiosError<{
        message?: string;
      }>;

      console.error("Failed to auto-complete interview:", error);

      setError(
        axiosError.response?.data?.message ||
        "Time is up, The interview could not be completed. Please try again."
      );
    }
    finally {
      setSubmittingAnswer(false);
    }
  };

  autoCompleteInterview();
}, [timeLeft, id, navigate]);

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (timeLeft % 60).toString().padStart(2, "0");

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

      setEvaluation(response.data.evaluation);

      if (response.data.finalReport) {
        navigate("/feedback", {
          state: {
            interviewId: id,
            finalReport: response.data.finalReport,
          },
        });

        return;
      }

      if (response.data.question) {
        setQuestion(response.data.question);
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

  if (loadingQuestion) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>

          <h1 className="text-3xl font-bold text-black mb-3">
            Preparing Your Interview
          </h1>

          <p className="text-gray-500 text-lg">
            AI is generating your interview question...
          </p>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-10 text-center">
          <h1 className="text-3xl font-bold text-black mb-4">
            Unable to Load Interview
          </h1>

          <p className="text-gray-500 mb-6">
            {error || "No question available."}
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.min(
    (question.number / 25) * 100, 100
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">InterviewAI</h1>

          <div className="flex items-center gap-6">
            <span className="text-gray-600 font-medium">
              Question {question.number} of {25}
            </span>

            <div
              className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${
                timeLeft <= 120
                  ? "bg-red-50 text-red-600 border-red-200"
                  : timeLeft <= 300
                    ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                    : "bg-green-50 text-green-600 border-green-200"
              }`}
            >
              <span className="mr-2">Time</span>
              {minutes}:{seconds}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <p className="text-gray-600 font-medium">Interview Progress</p>

            <p className="text-gray-500">{Math.round(progress)}%</p>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <section className="bg-white border border-gray-300 rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {question.category || "Technical"}
            </span>

            {question.topic && (
              <span className="text-gray-500 text-sm">{question.topic}</span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-black leading-relaxed">
            {question.question}
          </h2>
        </section>

        <section className="bg-white border border-gray-300 rounded-2xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-4">
            <label htmlFor="answer" className="text-xl font-bold text-black">
              Your Answer
            </label>

            <span className="text-sm text-gray-400">
              {answer.length} characters
            </span>
          </div>

          <textarea
            id="answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Type your answer here..."
            rows={9}
            className="w-full border border-gray-300 rounded-lg px-4 py-4 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <div className="flex justify-end mt-5">
            <button
              onClick={handleSubmitAnswer}
              disabled={submittingAnswer}
              className="bg-blue-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {submittingAnswer ? "Evaluating..." : "Submit Answer"}
            </button>
          </div>
        </section>

        {evaluation && (
          <section className="bg-white border border-gray-300 rounded-2xl shadow-sm p-8 mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black">AI Evaluation</h2>

              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold">
                {evaluation.score}/10
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">
              {evaluation.evaluation}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-300 rounded-lg p-5">
                <h3 className="text-lg font-bold text-black mb-4">Strengths</h3>

                <ul className="space-y-3">
                  {evaluation.strengths.map((strength, index) => (
                    <li key={index} className="text-gray-600">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-gray-300 rounded-lg p-5">
                <h3 className="text-lg font-bold text-black mb-4">
                  Areas to Improve
                </h3>

                <ul className="space-y-3">
                  {evaluation.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-gray-600">
                      • {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {question.number >= 15 && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleFinish}
              disabled={submittingAnswer}
              className="bg-blue-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              Finish Interview
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default InterviewPage;
