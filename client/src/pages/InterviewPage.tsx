import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function InterviewPage() {
  const navigate = useNavigate();

  const questions = [
    "Tell me about yourself.",
    "What are your strengths?",
    "Why should we hire you?",
    "Explain polymorphism.",
    "Difference between SQL and NoSQL.",
    "What is React?",
    "Explain REST API.",
    "What is JWT?",
    "Tell me about a challenging project.",
    "Where do you see yourself in 5 years?"
  ];

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState<string[]>(
    Array(questions.length).fill("")
  );

  const [isListening, setIsListening] = useState(false);

  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timer);
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    if (answers[currentQuestion].trim() === "") {
      alert("Please answer the question before proceeding.");
      return;
    }

    setCurrentQuestion(currentQuestion + 1);
  };

  const handlePrevious = () => {
    setCurrentQuestion(currentQuestion - 1);
  };

  const handleFinish = () => {
    if (answers[currentQuestion].trim() === "") {
      alert("Please answer the last question.");
      return;
    }

    alert("Interview Completed!");
    navigate("/feedback");
  };

  const progress =
    ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-8">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-10">

        {/* Header */}

        <div className="flex justify-between items-center">

          <h1 className="text-5xl font-bold">
            🎤 AI Interview
          </h1>

          <p className="text-2xl font-semibold">
            {Math.floor(timeLeft / 60)}:
            {String(timeLeft % 60).padStart(2, "0")}
          </p>

        </div>

        {/* Progress */}

        <div className="mt-8">

          <p className="text-lg text-gray-600 mb-2">
            Question {currentQuestion + 1} of {questions.length}
          </p>

          <div className="w-full bg-gray-200 rounded-full h-3">

            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />

          </div>

        </div>

        {/* Question */}

        <h2 className="text-4xl font-semibold mt-10">
          {questions[currentQuestion]}
        </h2>

        <p className="text-gray-500 mt-2">
          Answer naturally. You can type or use your microphone.
        </p>

        {/* Answer */}

        <textarea
          rows={9}
          value={answers[currentQuestion]}
          onChange={(e) => {
            const updatedAnswers = [...answers];
            updatedAnswers[currentQuestion] = e.target.value;
            setAnswers(updatedAnswers);
          }}
          placeholder="Type your answer here..."
          className="w-full border border-gray-400 rounded-xl mt-6 p-5 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Character Counter */}

        <div className="text-right text-gray-500 mt-2">
          {answers[currentQuestion].length}/1000 characters
        </div>

        {/* Voice */}

        <div className="mt-6">

          {!isListening ? (

            <button
              onClick={() => setIsListening(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              🎤 Start Speaking
            </button>

          ) : (

            <button
              onClick={() => setIsListening(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              ⏹ Stop Recording
            </button>

          )}

          <p className="mt-3 text-lg font-medium">

            {isListening ? (

              <span className="text-red-600 animate-pulse">
                🔴 Listening...
              </span>

            ) : (

              <span className="text-gray-500">
                ⚫ Microphone Off
              </span>

            )}

          </p>

        </div>

        {/* Clear */}

        <button
          onClick={() => {
            const updatedAnswers = [...answers];
            updatedAnswers[currentQuestion] = "";
            setAnswers(updatedAnswers);
          }}
          className="mt-5 text-red-500 hover:underline"
        >
          Clear Answer
        </button>

        {/* Bottom Buttons */}

        <div className="flex justify-between items-center mt-10">

          <button
            disabled={currentQuestion === 0}
            onClick={handlePrevious}
            className={`px-6 py-3 rounded-lg font-semibold
            ${
              currentQuestion === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gray-600 hover:bg-gray-700 text-white"
            }`}
          >
            Previous
          </button>

          {currentQuestion === questions.length - 1 ? (

            <button
              onClick={handleFinish}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Finish Interview
            </button>

          ) : (

            <button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Next Question
            </button>

          )}

        </div>

      </div>

    </div>
  );
}

export default InterviewPage;