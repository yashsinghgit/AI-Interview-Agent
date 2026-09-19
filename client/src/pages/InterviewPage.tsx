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

  const [pendingQuestion, setPendingQuestion] =
    useState<InterviewQuestion | null>(null);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  const questionLoaded = useRef(false);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id || questionLoaded.current) {
      return;
    }

    questionLoaded.current = true;

    const loadInterview = async () => {
      try {
        setLoadingQuestion(true);
        setError("");

        // Get the existing interview from the database
        const response = await api.get(`/interviews/${id}`);

        const interview = response.data.interview;

        // If interview is already completed
        if (interview.status === "completed") {
          setError("This interview has already been completed.");
          return;
        }

        // Find the latest question
        const conversation = interview.conversation || [];

        const latestQuestion = conversation[conversation.length - 1];

        // If there is already an unanswered question,
        // restore it instead of generating a new one.
        if (latestQuestion && !latestQuestion.answer) {
          setQuestion({
            number: interview.currentQuestion,
            question: latestQuestion.question,
            category: latestQuestion.category,
            topic: latestQuestion.topic,
            reason: latestQuestion.reason,
            decision: latestQuestion.decision,
          });

          return;
        }

        // No unanswered question exists.
        // Generate a new one.
        const questionResponse = await api.post(`/interviews/${id}/question`);

        setQuestion(questionResponse.data.question);
      } catch (err) {
        const axiosError = err as AxiosError<{
          message?: string;
        }>;

        console.error("Failed to load interview:", err);

        setError(
          axiosError.response?.data?.message || "Failed to load interview.",
        );
      } finally {
        setLoadingQuestion(false);
      }
    };

    loadInterview();
  }, [id]);

  // Interview timer
  // Timer pauses while AI is evaluating the answer.

  // Interview timer
  // Timer pauses while AI is evaluating the answer.

  useEffect(() => {
    if (!id) return;

    const storageKey = `interviewEndTime_${id}`;

    let savedEndTime = localStorage.getItem(storageKey);

    if (!savedEndTime) {
      savedEndTime = String(Date.now() + 30 * 60 * 1000);

      localStorage.setItem(storageKey, savedEndTime);
    }

    const updateTimer = () => {
      const currentEndTime = Number(localStorage.getItem(storageKey));

      const pausedAt = localStorage.getItem(`interviewPausedAt_${id}`);

      // If AI is evaluating, freeze the timer
      // at the moment the answer was submitted.
      const currentTime = pausedAt ? Number(pausedAt) : Date.now();

      const remaining = Math.max(
        0,
        Math.floor((currentEndTime - currentTime) / 1000),
      );

      setTimeLeft(remaining);
    };

    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [id]);


  // Automatically complete interview when timer reaches zero
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

        navigate(`/feedback/${id}`, {
          state: {
            interviewId: id,
            finalReport: response.data?.interview?.finalReport,
          },
        });
      } catch (error) {
        const axiosError = error as AxiosError<{
          message?: string;
        }>;

        console.error("Failed to auto-complete interview:", error);

        setError(
          axiosError.response?.data?.message ||
            "Time is up, The interview could not be completed. Please try again.",
        );
      } finally {
        setSubmittingAnswer(false);
      }
    };

    autoCompleteInterview();
  }, [timeLeft, id, navigate]);

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!id || !question) {
      return;
    }

    if (!answer.trim()) {
      alert("Please answer the question before proceeding.");
      return;
    }

    // Pause timer before AI evaluation starts
    localStorage.setItem(`interviewPausedAt_${id}`, String(Date.now()));

    try {
      setSubmittingAnswer(true);
      setError("");

      const response = await api.post(`/interviews/${id}/answer`, {
        answer: answer.trim(),
      });

      setEvaluation(response.data.evaluation);

      // If interview is completed, go directly to report
      if (response.data.finalReport) {
        navigate(`/feedback/${id}`, {
          state: {
            interviewId: id,
            finalReport: response.data.finalReport,
          },
        });

        return;
      }

      // Store the next question without displaying it yet
      if (response.data.question) {
        setPendingQuestion(response.data.question);

        setAnswer("");
      }
    } catch (err) {
      const axiosError = err as AxiosError<{
        message?: string;
      }>;

      console.error("Failed to submit answer:", err);

      alert(axiosError.response?.data?.message || "Failed to submit answer.");
    } finally {
      // Calculate how long AI evaluation took
      const pausedAt = localStorage.getItem(`interviewPausedAt_${id}`);

      if (pausedAt) {
        const elapsed = Date.now() - Number(pausedAt);

        const endTimeKey = `interviewEndTime_${id}`;

        const savedEndTime = localStorage.getItem(endTimeKey);

        if (savedEndTime) {
          localStorage.setItem(
            endTimeKey,
            String(Number(savedEndTime) + elapsed),
          );
        }

        // Remove pause marker
        localStorage.removeItem(`interviewPausedAt_${id}`);
      }

      setSubmittingAnswer(false);
    }
  };

  // Move pending question onto the screen
  const handleNextQuestion = () => {
    if (!pendingQuestion) {
      return;
    }

    setQuestion(pendingQuestion);
    setPendingQuestion(null);
    setEvaluation(null);
  };

  // Finish interview manually
  const handleFinish = async () => {
    if (!id) {
      return;
    }

    try {
      setSubmittingAnswer(true);

      const response = await api.patch(`/interviews/${id}/complete`);

      navigate(`/feedback/${id}`, {
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

  // Loading state
  if (loadingQuestion || !question) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">
          Loading interview question...
        </div>
      </div>
    );
  }

  // Error state
  if (error && !question) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 max-w-lg w-full text-center">
          <h2 className="text-xl font-bold text-red-600 mb-3">
            Something went wrong
          </h2>

          <p className="text-gray-600 mb-6">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.min((question.number / 25) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>

            <h1 className="text-xl font-bold text-gray-900">InterviewAI</h1>
          </div>

          {/* Interview Status */}
          <div className="flex items-center gap-4">
            {/* Question Number */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-sm text-gray-500">Question</span>

              <span className="text-sm font-bold text-gray-900">
                {question.number} / 25
              </span>
            </div>

            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border transition-colors ${
                timeLeft <= 120
                  ? "bg-red-50 text-red-600 border-red-200"
                  : timeLeft <= 300
                    ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                    : "bg-green-50 text-green-600 border-green-200"
              }`}
            >
              <span className="text-sm">⏱</span>

              <span className="font-mono">
                {minutes}:{seconds}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 md:px-8 md:py-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Interview Progress
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Question {question.number} of 25
              </p>
            </div>

            <span className="text-sm font-semibold text-blue-600">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {/* QUESTION / ANSWER SCREEN */}
        {!evaluation ? (
          <>
            {/* Question */}
            <section className="bg-white border border-gray-300 rounded-2xl shadow-sm p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {question.category || "Technical"}
                </span>

                {question.topic && (
                  <span className="text-gray-500 text-sm">
                    {question.topic}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-black leading-relaxed">
                {question.question}
              </h2>
            </section>

            {/* Answer */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
              {/* Answer Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Your Answer
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Explain your approach clearly and support your answer with
                    examples when possible.
                  </p>
                </div>

                <span className="text-sm text-gray-400">
                  {answer.length} characters
                </span>
              </div>

              {/* Answer Input */}
              <textarea
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer here..."
                rows={9}
                disabled={submittingAnswer}
                className="w-full border border-gray-200 rounded-xl px-4 py-4 text-gray-700 resize-none bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100"
              />

              {/* Submit Area */}
              <div className="flex items-center justify-between mt-5">
                <span className="text-xs text-gray-400">
                  Take your time and structure your response.
                </span>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={submittingAnswer}
                  className="bg-blue-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingAnswer ? "Evaluating..." : "Submit Answer →"}
                </button>
              </div>
            </section>
          </>
        ) : (
          /* AI EVALUATION SCREEN */
          <section className="bg-white border border-gray-300 rounded-2xl shadow-sm p-8">
            {/* Evaluation Complete */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 text-2xl mb-4">
                ✓
              </div>

              <h2 className="text-2xl font-bold text-black">
                AI Evaluation Complete
              </h2>

              <p className="text-gray-500 mt-2">
                Here's how your answer performed.
              </p>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
              <p className="text-sm font-medium text-gray-500 mb-2">
                Your Score
              </p>

              <div className="text-5xl font-bold text-blue-600">
                {evaluation.score}
                <span className="text-2xl text-gray-400">/10</span>
              </div>
            </div>

            {/* Overall Evaluation */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-black mb-3">
                Overall Evaluation
              </h3>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="text-gray-600 leading-relaxed">
                  {evaluation.evaluation}
                </p>
              </div>
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                    ✓
                  </div>

                  <h3 className="text-lg font-bold text-black">Strengths</h3>
                </div>

                <ul className="space-y-3">
                  {evaluation.strengths.map((strength, index) => (
                    <li key={index} className="flex gap-3 text-gray-600">
                      <span className="text-green-600 font-bold">✓</span>

                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">
                    !
                  </div>

                  <h3 className="text-lg font-bold text-black">
                    Areas to Improve
                  </h3>
                </div>

                <ul className="space-y-3">
                  {evaluation.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex gap-3 text-gray-600">
                      <span className="text-yellow-600 font-bold">•</span>

                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Next Question */}
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleNextQuestion}
                disabled={!pendingQuestion}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Next Question →
              </button>
            </div>
          </section>
        )}

        {/* Finish Interview */}
        {question.number >= 15 && !evaluation && (
          <div className="flex justify-between items-center mt-6 px-1">
            <p className="text-sm text-gray-500">
              You have reached the minimum number of questions.
            </p>

            <button
              onClick={handleFinish}
              disabled={submittingAnswer}
              className="border border-gray-300 bg-white text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
