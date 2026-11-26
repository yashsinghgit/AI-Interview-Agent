import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  X,
  CornerDownLeft,
  Mic,
  MicOff,
  Check,
  FileText,
} from "lucide-react";
import api from "../services/api";
import { useDelayedLoading } from "../hooks/useDelayedLoading";
import { InterviewQuestionSkeleton } from "../components/AppSkeletons";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../components/ui/alert-dialog";

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

type TopicStatus = "not_started" | "in_progress" | "covered";

interface TopicProgress {
  behavioral: TopicStatus;
  technical: TopicStatus;
  problemSolving: TopicStatus;
}

// Web Speech API interface definitions for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

function getScoreBand(score: number) {
  if (score < 50) {
    return {
      band: "low",
      label: "Needs Refinement",
      colorClass: "text-destructive border-destructive/30 bg-destructive/5",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      meaning: "The response lacked clear structure or specific technical evidence. Focus on answering directly with concrete examples.",
    };
  }
  if (score < 75) {
    return {
      band: "mid",
      label: "Solid Foundation",
      colorClass: "text-warning border-warning/30 bg-warning/5",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
      meaning: "Good core understanding demonstrated; sharpen with quantifiable outcomes and explicit trade-off explanations.",
    };
  }
  return {
    band: "high",
    label: "Strong Response",
    colorClass: "text-success border-success/30 bg-success/5",
    badgeClass: "bg-success/10 text-success border-success/20",
    meaning: "Well-structured, concise, and technically grounded. Demonstrated clear competence and communication.",
  };
}

function deriveSubScores(overallScore: number) {
  const base = Math.max(25, Math.min(95, overallScore));
  return [
    { label: "Structure", score: Math.min(100, Math.max(30, base + 4)), desc: "Framing & logical flow" },
    { label: "Technical Depth", score: Math.min(100, Math.max(30, base - 2)), desc: "Accuracy & fundamentals" },
    { label: "Impact & Scope", score: Math.min(100, Math.max(25, base - 5)), desc: "Quantified results & trade-offs" },
    { label: "Relevance", score: Math.min(100, Math.max(35, base + 3)), desc: "Direct adherence to prompt" },
  ];
}

function InterviewPage() {
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [roleTitle, setRoleTitle] = useState<string>("Technical Mock Interview");
  const [answer, setAnswer] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<InterviewQuestion | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState("");

  // Delayed skeleton loading (only after 300ms) with 15s timeout
  const isBusy = loadingQuestion || submittingAnswer;
  const { showSkeleton: showBusySkeleton } = useDelayedLoading(isBusy, {
    delay: 300,
    timeout: 15000,
    timeoutMessage: "This is taking longer than expected",
    retryAction: () => {
      if (loadingQuestion) {
        window.location.reload();
      } else {
        handleSubmitAnswer();
      }
    },
  });
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);

  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const [topicProgress, setTopicProgress] = useState<TopicProgress>({
    behavioral: "not_started",
    technical: "in_progress",
    problemSolving: "not_started",
  });

  const questionLoaded = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const isMac = useMemo(() => {
    if (typeof window === "undefined" || !window.navigator) return false;
    return /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent);
  }, []);
  const { id } = useParams<{ id: string }>();

  // STAR Guide detection logic
  const starStatus = useMemo(() => {
    const text = answer.toLowerCase();
    const hasSituation =
      text.length > 20 &&
      /\b(when|at|project|company|team|client|situation|context|problem|background|in my previous|working on)\b/.test(text);
    const hasTask =
      /\b(responsible|needed to|had to|task|objective|goal|requirement|assigned|expected|my role|challenge was|in charge of)\b/.test(text);
    const hasAction =
      /\b(built|implemented|designed|created|developed|refactored|chose|wrote|migrated|configured|decided|led|introduced|optimized|architected|solved)\b/.test(text);
    const hasResult =
      /\b(result|improved|reduced|increased|percent|%|outcome|saved|impact|delivered|latency|performance|succeeded|learned|metrics|throughput)\b/.test(text);

    return {
      situation: hasSituation,
      task: hasTask,
      action: hasAction,
      result: hasResult,
    };
  }, [answer]);

  // Determine topic statuses dynamically from conversation history
  const syncTopicProgress = (category?: string, conversationLen = 1) => {
    const cat = (category || "").toLowerCase();
    setTopicProgress(() => {
      let b: TopicStatus = conversationLen > 3 ? "covered" : "not_started";
      let t: TopicStatus = "in_progress";
      let p: TopicStatus = conversationLen > 6 ? "covered" : "not_started";

      if (cat.includes("behavioral")) {
        b = "in_progress";
      } else if (cat.includes("system") || cat.includes("problem") || cat.includes("scenario")) {
        p = "in_progress";
      } else {
        t = "in_progress";
      }

      return { behavioral: b, technical: t, problemSolving: p };
    });
  };

  useEffect(() => {
    if (!id || questionLoaded.current) {
      return;
    }

    questionLoaded.current = true;

    const loadInterview = async () => {
      try {
        setLoadingQuestion(true);
        setError("");

        const response = await api.get(`/interviews/${id}`);
        const interview = response.data.interview;

        if (interview.role) {
          setRoleTitle(interview.role);
        }

        if (interview.expiresAt) {
          const endTime = new Date(interview.expiresAt).getTime();
          localStorage.setItem(`interviewEndTime_${id}`, String(endTime));
        }

        if (interview.status === "completed") {
          setError("This interview has already been completed.");
          return;
        }

        if (interview.remainingSeconds === 0) {
          setError("This interview session has expired. Time limit exceeded.");
          return;
        }

        const conversation = interview.conversation || [];
        const latestQuestion = conversation[conversation.length - 1];

        if (latestQuestion && !latestQuestion.answer) {
          const restoredQ: InterviewQuestion = {
            number: interview.currentQuestion,
            question: latestQuestion.question,
            category: latestQuestion.category,
            topic: latestQuestion.topic,
            reason: latestQuestion.reason,
            decision: latestQuestion.decision,
          };
          setQuestion(restoredQ);
          syncTopicProgress(restoredQ.category, conversation.length);
          return;
        }

        const questionResponse = await api.post(`/interviews/${id}/question`);
        const incomingQuestion = questionResponse.data.question;
        setQuestion(incomingQuestion);
        syncTopicProgress(incomingQuestion.category, conversation.length + 1);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        console.error("Failed to load interview:", err);
        setError(axiosError.response?.data?.message || "Unable to start the interview session. Please return to the setup page.");
      } finally {
        setLoadingQuestion(false);
      }
    };

    loadInterview();
  }, [id]);

  // Timer logic - paused while user reviews evaluation
  useEffect(() => {
    if (!id) return;

    const storageKey = `interviewEndTime_${id}`;
    let savedEndTime = localStorage.getItem(storageKey);

    if (!savedEndTime) {
      savedEndTime = String(Date.now() + 20 * 60 * 1000);
      localStorage.setItem(storageKey, savedEndTime);
    }

    const updateTimer = () => {
      const currentEndTime = Number(localStorage.getItem(storageKey));
      const pausedAt = localStorage.getItem(`interviewPausedAt_${id}`);

      const currentTime = pausedAt ? Number(pausedAt) : Date.now();
      const remaining = Math.max(0, Math.floor((currentEndTime - currentTime) / 1000));

      setTimeLeft(remaining);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [id]);

  // Auto-prompt when time is up
  useEffect(() => {
    if (timeLeft !== 0 || !id || loadingQuestion) {
      return;
    }
    setShowTimeUpDialog(true);
  }, [timeLeft, id, loadingQuestion]);

  const handleTimeUpConclude = async () => {
    try {
      setSubmittingAnswer(true);
      setShowTimeUpDialog(false);
      const response = await api.patch(`/interviews/${id}/complete`, { timedOut: true });
      navigate(`/feedback/${id}`, {
        state: {
          interviewId: id,
          finalReport: response.data?.interview?.finalReport,
          endingReason: "Time limit reached (20 minutes).",
        },
      });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const reason =
        axiosError.response?.data?.message || "Interview session time expired.";
      toast.error(reason, {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => handleTimeUpConclude(),
        },
      });
      setError(reason);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Web Speech API dictation
  const toggleSpeechRecognition = () => {
    const SpeechRecognitionApi =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      toast.error(
        "Voice speech recognition is not supported in this browser. Please use Chrome or Edge.",
        { duration: 6000 }
      );
      return;
    }

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionApi();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = 0; i < Object.keys(event.results).length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            transcript += item[0].transcript + " ";
          }
        }
        if (transcript.trim()) {
          setAnswer((prev) => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  // Pause the interview timer while question or evaluation is loading, or during evaluation review
  useEffect(() => {
    if (!id) return;
    const isPaused = Boolean(evaluation) || loadingQuestion || submittingAnswer;

    if (isPaused) {
      if (!localStorage.getItem(`interviewPausedAt_${id}`)) {
        localStorage.setItem(`interviewPausedAt_${id}`, String(Date.now()));
      }
    } else {
      const pausedAt = localStorage.getItem(`interviewPausedAt_${id}`);
      if (pausedAt) {
        const elapsed = Date.now() - Number(pausedAt);
        const endTimeKey = `interviewEndTime_${id}`;
        const savedEndTime = localStorage.getItem(endTimeKey);
        if (savedEndTime) {
          localStorage.setItem(endTimeKey, String(Number(savedEndTime) + elapsed));
        }
        localStorage.removeItem(`interviewPausedAt_${id}`);
      }
    }
  }, [id, evaluation, loadingQuestion, submittingAnswer]);

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  const isTimerLow = timeLeft <= 120; // Last 2 minutes
  const isTimerPaused = Boolean(evaluation) || loadingQuestion || submittingAnswer;

  // Total timer fraction (20 minutes = 1200 seconds)
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / (20 * 60)) * 100));

  const handleSubmitAnswer = async () => {
    if (!id || !question) return;

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    const cleanAnswer = answer.trim();
    if (!cleanAnswer) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }

    localStorage.setItem(`interviewPausedAt_${id}`, String(Date.now()));

    try {
      setSubmittingAnswer(true);
      setError("");

      const response = await api.post(`/interviews/${id}/answer`, {
        answer: cleanAnswer,
      });

      setEvaluation(response.data.evaluation);

      if (response.data.finalReport) {
        const reasonText = response.data.enough_signal
          ? "You have covered sufficient ground across core interview domains."
          : "Session finalized based on questions answered.";
        navigate(`/feedback/${id}`, {
          state: {
            interviewId: id,
            finalReport: response.data.finalReport,
            endingReason: reasonText,
          },
        });
        return;
      }

      if (response.data.question) {
        setPendingQuestion(response.data.question);
        setAnswer("");
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      console.error("Failed to submit answer:", err);
      setError(axiosError.response?.data?.message || "Failed to process your response. Please try again.");
    } finally {
      const pausedAt = localStorage.getItem(`interviewPausedAt_${id}`);
      if (pausedAt) {
        const elapsed = Date.now() - Number(pausedAt);
        const endTimeKey = `interviewEndTime_${id}`;
        const savedEndTime = localStorage.getItem(endTimeKey);
        if (savedEndTime) {
          localStorage.setItem(endTimeKey, String(Number(savedEndTime) + elapsed));
        }
        localStorage.removeItem(`interviewPausedAt_${id}`);
      }
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (!pendingQuestion) return;

    setQuestion(pendingQuestion);
    syncTopicProgress(pendingQuestion.category);
    setPendingQuestion(null);
    setEvaluation(null);
    setError("");

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleFinishEarly = async () => {
    if (!id) return;
    try {
      setSubmittingAnswer(true);
      setShowExitConfirm(false);

      const response = await api.patch(`/interviews/${id}/complete`);
      const report = response.data?.interview?.finalReport;

      navigate(`/feedback/${id}`, {
        state: {
          interviewId: id,
          finalReport: report,
          endingReason: "Interview concluded by user request.",
        },
      });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const reason =
        axiosError.response?.data?.message ||
        "You must complete at least 5 questions before ending the session.";
      toast.error(reason, {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => handleFinishEarly(),
        },
      });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!submittingAnswer && answer.trim()) {
        handleSubmitAnswer();
      }
    }
  };

  // Conversational greeting separated from the question
  const greetingText = useMemo(() => {
    if (!question) return "";
    if (question.number === 1) {
      return "Welcome. Let's begin by reviewing your architectural and engineering approach.";
    }
    if (question.decision === "follow_up") {
      return "Following up on your previous answer:";
    }
    return "Moving to the next area of discussion:";
  }, [question]);

  // Loading Screen (Room Mode) with 300ms delayed skeleton
  if (!question) {
    if (error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <h2 className="font-display text-2xl text-foreground font-normal">
              Session Interrupted
            </h2>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              {error}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-sans text-sm font-medium rounded-md hover:opacity-90 transition"
              >
                Reload Interview
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-2.5 px-4 bg-transparent text-muted-foreground hover:text-foreground font-sans text-sm transition"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!showBusySkeleton) {
      return (
        <div className="min-h-screen bg-background" aria-busy="true" />
      );
    }
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col relative">
        <header className="border-b border-border bg-card/80 sticky top-0 z-20 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <span className="font-sans text-xs sm:text-sm font-medium text-foreground truncate">
              {roleTitle}
            </span>
          </div>
        </header>
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12">
          <InterviewQuestionSkeleton statusText="Preparing your next question..." />
        </main>
      </div>
    );
  }

  // Follow-up condition: ONLY if decision is follow_up AND question number > 1 (Never on question 1)
  const isFollowUp = question.decision === "follow_up" && question.number > 1;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* THIN DRAINING LINE TIMER AT TOP EDGE OF SCREEN */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] bg-border/40 z-30 overflow-hidden"
        title={isTimerPaused ? "Timer paused" : `${minutes}:${seconds} remaining`}
      >
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isTimerLow ? "bg-accent" : "bg-support"
          }`}
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* ROOM HEADER (Minimal top HUD with no boxed timer) */}
      <header className="border-b border-border bg-card/80 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Role presence */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-support shrink-0" aria-label="Session live" />
            <h1 className="font-sans text-xs sm:text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-[280px]">
              {roleTitle}
            </h1>
          </div>

          {/* Center: Dynamic Topic Coverage Tracker */}
          <div className="hidden md:flex items-center gap-5 text-xs font-sans text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${topicProgress.behavioral === "covered" ? "bg-support" : topicProgress.behavioral === "in_progress" ? "bg-support" : "bg-border"}`} />
              <span className={topicProgress.behavioral === "in_progress" ? "text-foreground font-medium" : ""}>Behavioral</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${topicProgress.technical === "covered" ? "bg-support" : topicProgress.technical === "in_progress" ? "bg-support" : "bg-border"}`} />
              <span className={topicProgress.technical === "in_progress" ? "text-foreground font-medium" : ""}>Technical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${topicProgress.problemSolving === "covered" ? "bg-support" : topicProgress.problemSolving === "in_progress" ? "bg-support" : "bg-border"}`} />
              <span className={topicProgress.problemSolving === "in_progress" ? "text-foreground font-medium" : ""}>Problem Solving</span>
            </div>
          </div>

          {/* Right: Unboxed subtle timer reading and Session Exit */}
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs tabular-nums ${
                isTimerLow ? "text-accent font-semibold" : "text-muted-foreground"
              }`}
            >
              {minutes}:{seconds}
              {isTimerPaused && <span className="ml-1 text-[10px] uppercase font-sans text-muted-foreground">(Paused)</span>}
            </span>

            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="text-xs font-sans text-muted-foreground hover:text-foreground px-2 py-1 rounded transition"
            >
              Leave
            </button>

            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="text-xs font-sans text-muted-foreground hover:text-foreground px-2 py-1 rounded transition"
            >
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* MAIN ROOM CONTENT - TRANSCRIPT LAYOUT */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 flex flex-col gap-10">
        {/* REVERSIBLE ERROR BANNER */}
        {error && (
          <div className="p-3.5 bg-destructive/5 border border-destructive/20 rounded-md text-destructive text-sm flex items-start justify-between gap-3 font-sans">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-destructive/80 hover:text-destructive shrink-0"
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* QUESTION & ANSWER SCREEN */}
        {submittingAnswer && showBusySkeleton ? (
          <InterviewQuestionSkeleton statusText="Reading your answer..." />
        ) : !evaluation ? (
          <div className="space-y-10">
            {/* 1. INTERVIEWER TURN: Wrapped in a very light --muted band */}
            <div className="bg-muted/50 border border-border/80 rounded-xl p-5 sm:p-7">
              <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 md:gap-6 items-start">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground pt-1 select-none">
                  INTERVIEWER
                </div>

                <div className="space-y-3">
                  {/* Greeting (small, muted) separated from question */}
                  <p className="font-sans text-xs text-muted-foreground leading-normal">
                    {greetingText}
                  </p>

                  {/* Follow-up Badge (ONLY if follow-up, and NEVER on question 1) */}
                  {isFollowUp && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-md">
                      <Sparkles size={12} />
                      <span>Follow-up</span>
                    </div>
                  )}

                  {/* The Question Text in Newsreader Variable ~28px, line-height 1.4, NO quotation marks */}
                  <h2 className="font-reading text-[28px] leading-[1.4] font-normal text-foreground tracking-normal">
                    {question.question}
                  </h2>

                  {/* "From your resume" Chip under the question: uses --support-tint with 1px border in --border */}
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-sans text-support bg-support-tint border border-border px-2.5 py-0.5 rounded-md font-medium">
                      <FileText size={11} className="text-support" />
                      From your resume
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CANDIDATE TURN (Transcript layout on the paper background) */}
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 md:gap-6 items-start pt-2">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground pt-3 select-none">
                YOU
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_210px] gap-6 items-start">
                {/* Left: Input Textarea */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-sans text-muted-foreground">
                    <label htmlFor="answer-input" className="font-medium text-foreground">
                      Your Response
                    </label>
                    <span className="text-muted-foreground">
                      Aim for 60–90 seconds
                    </span>
                  </div>

                  <div className="relative rounded-lg border border-border bg-card shadow-xs focus-within:ring-2 focus-within:ring-support focus-within:border-support transition">
                    <textarea
                      id="answer-input"
                      ref={textareaRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Discuss the technical decisions, architecture, explicit trade-offs, and concrete results..."
                      rows={9}
                      disabled={submittingAnswer}
                      className="w-full bg-transparent p-4 font-sans text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 leading-relaxed outline-none resize-y min-h-[190px] disabled:opacity-50"
                    />
                  </div>

                  {/* Bottom row: strictly one line. Hint text left, mic button with tooltip, then Submit */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground truncate">
                      <CornerDownLeft size={13} className="shrink-0" />
                      <span className="truncate">Press {isMac ? "⌘+Enter" : "Ctrl+Enter"} to submit</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Speak Your Answer Mic Button with Tooltip */}
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        disabled={submittingAnswer}
                        className={`inline-flex items-center justify-center p-2.5 rounded-md border text-xs font-sans transition focus:outline-none focus:ring-2 focus:ring-support ${
                          isListening
                            ? "bg-destructive/10 border-destructive/30 text-destructive animate-pulse"
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                        title="Speak your answer"
                        aria-label="Speak your answer"
                      >
                        {isListening ? (
                          <MicOff size={15} />
                        ) : (
                          <Mic size={15} className="text-muted-foreground hover:text-foreground" />
                        )}
                      </button>

                      {/* Submit Response Button (Only Accent Element on Screen, Distinct Lower-Contrast Disabled State) */}
                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        disabled={submittingAnswer || !answer.trim()}
                        className={`inline-flex items-center justify-center gap-2 font-sans text-sm font-medium px-5 py-2.5 rounded-md transition shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent ${
                          submittingAnswer || !answer.trim()
                            ? "bg-accent/65 text-white/90 cursor-not-allowed"
                            : "bg-accent hover:opacity-95 text-white"
                        }`}
                      >
                        {submittingAnswer ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Evaluating...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Answer</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: STAR GUIDE Card using --support-tint with 1px border in --border */}
                <div className="p-4 bg-support-tint border border-border rounded-lg space-y-3 font-sans">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-support">
                      STAR Framework
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Ticks live as you cover each structural dimension:
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Situation */}
                    <div
                      className={`flex items-start gap-2 text-xs transition-colors ${
                        starStatus.situation ? "text-support font-medium" : "text-muted-foreground/70"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          starStatus.situation ? "bg-support text-white border-support" : "border-border bg-card/60"
                        }`}
                      >
                        {starStatus.situation && <Check size={10} />}
                      </div>
                      <div>
                        <span className="font-semibold">Situation:</span>
                        <span className="text-[11px] block text-muted-foreground">Context & problem background</span>
                      </div>
                    </div>

                    {/* Task */}
                    <div
                      className={`flex items-start gap-2 text-xs transition-colors ${
                        starStatus.task ? "text-support font-medium" : "text-muted-foreground/70"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          starStatus.task ? "bg-support text-white border-support" : "border-border bg-card/60"
                        }`}
                      >
                        {starStatus.task && <Check size={10} />}
                      </div>
                      <div>
                        <span className="font-semibold">Task:</span>
                        <span className="text-[11px] block text-muted-foreground">Your role & explicit target</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div
                      className={`flex items-start gap-2 text-xs transition-colors ${
                        starStatus.action ? "text-support font-medium" : "text-muted-foreground/70"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          starStatus.action ? "bg-support text-white border-support" : "border-border bg-card/60"
                        }`}
                      >
                        {starStatus.action && <Check size={10} />}
                      </div>
                      <div>
                        <span className="font-semibold">Action:</span>
                        <span className="text-[11px] block text-muted-foreground">Specific decisions & engineering</span>
                      </div>
                    </div>

                    {/* Result */}
                    <div
                      className={`flex items-start gap-2 text-xs transition-colors ${
                        starStatus.result ? "text-support font-medium" : "text-muted-foreground/70"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          starStatus.result ? "bg-support text-white border-support" : "border-border bg-card/60"
                        }`}
                      >
                        {starStatus.result && <Check size={10} />}
                      </div>
                      <div>
                        <span className="font-semibold">Result:</span>
                        <span className="text-[11px] block text-muted-foreground">Measurable metrics & impact</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ANSWER EVALUATION / FEEDBACK SCREEN (Room Mode, Timer Paused) */
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Header banner explaining timer state */}
            <div className="flex items-center justify-between p-3 bg-muted border border-border rounded-md text-xs font-sans text-muted-foreground">
              <span className="flex items-center gap-2 font-medium text-foreground">
                Timer paused while you review your evaluation
              </span>
              <span className="font-mono">{minutes}:{seconds} remaining</span>
            </div>

            {/* Score Band Header */}
            {(() => {
              const band = getScoreBand(evaluation.score);
              const subScores = deriveSubScores(evaluation.score);
              return (
                <div className="space-y-6">
                  {/* Score & Meaning */}
                  <div className={`p-6 rounded-lg border ${band.colorClass} space-y-3`}>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
                          {evaluation.score}
                        </span>
                        <span className="font-mono text-sm opacity-60">/ 100</span>
                        <span className={`text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${band.badgeClass}`}>
                          {band.label}
                        </span>
                      </div>
                    </div>
                    <p className="font-sans text-sm leading-relaxed text-foreground/90">
                      {band.meaning}
                    </p>
                  </div>

                  {/* Sub-Scores Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {subScores.map((sub) => (
                      <div key={sub.label} className="p-3 bg-card border border-border rounded-md space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="font-sans text-xs font-medium text-muted-foreground">{sub.label}</span>
                          <span className="font-mono text-xs font-semibold text-foreground">{sub.score}</span>
                        </div>
                        <p className="font-sans text-[11px] text-muted-foreground leading-tight">{sub.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Interviewer Assessment */}
                  <div className="space-y-2">
                    <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Analysis of Your Response
                    </h3>
                    <div className="p-4 bg-card border border-border rounded-lg font-sans text-sm sm:text-base leading-relaxed text-foreground">
                      {evaluation.evaluation}
                    </div>
                  </div>

                  {/* Strengths & Weaknesses (2nd person: "you") */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-success font-sans uppercase tracking-wider">
                        <CheckCircle2 size={15} />
                        Demonstrated Strengths
                      </div>
                      <ul className="space-y-2 text-sm text-foreground font-sans">
                        {evaluation.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-success mt-0.5">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas for refinement */}
                    <div className="p-4 bg-card border border-border rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-warning font-sans uppercase tracking-wider">
                        <HelpCircle size={15} />
                        Areas for Refinement
                      </div>
                      <ul className="space-y-2 text-sm text-foreground font-sans">
                        {evaluation.weaknesses.map((weak, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-warning mt-0.5">•</span>
                            <span>{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Stronger Alternative Answer Blueprint */}
                  <div className="p-5 bg-card border border-border rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                      <Sparkles size={14} className="text-accent" />
                      Stronger Alternative Blueprint
                    </div>
                    <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                      To push this answer into the top tier, lead with a direct architectural or operational claim, cite an explicit constraint you managed, and conclude with the trade-off considered.
                    </p>
                    <div className="mt-3 p-3 bg-muted/60 border border-border/80 rounded font-sans text-xs sm:text-sm text-foreground/90 italic leading-relaxed">
                      "In my last project, we handled this by implementing an explicit write-through pattern with a short 60-second TTL rather than full invalidation, which traded slight eventual consistency for 40% lower cache stampede risk under burst traffic."
                    </div>
                  </div>

                  {/* What comes next preview & Next Question Button */}
                  <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="font-sans text-xs text-muted-foreground">
                      {pendingQuestion?.decision === "follow_up"
                        ? "Next: A follow-up to test the edge-case trade-offs of your approach."
                        : "Next: Moving to a new inquiry area."}
                    </p>

                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:opacity-95 text-white font-sans text-sm font-semibold px-6 py-2.5 rounded-md transition shadow-xs"
                    >
                      Continue to Next Question
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* ALERT DIALOG: END SESSION */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conclude interview session?</AlertDialogTitle>
            <AlertDialogDescription>
              Ending the session now will finalize evaluation based on your submitted answers and compute your comprehensive score. At least 5 completed questions are required to produce a final report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus onClick={() => setShowExitConfirm(false)}>
              Keep Practicing
            </AlertDialogCancel>
            <AlertDialogAction
              isDestructive
              disabled={submittingAnswer}
              onClick={handleFinishEarly}
            >
              {submittingAnswer ? "Concluding..." : "Conclude Interview"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG: LEAVE INTERVIEW */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave active interview?</AlertDialogTitle>
            <AlertDialogDescription>
              Your interview timer continues running on the server while you are away. You can resume this session anytime from your dashboard before the 20-minute window expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus onClick={() => setShowLeaveConfirm(false)}>
              Stay in Session
            </AlertDialogCancel>
            <AlertDialogAction
              isDestructive
              onClick={() => {
                setShowLeaveConfirm(false);
                navigate("/dashboard");
              }}
            >
              Exit to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG: TIME'S UP */}
      <AlertDialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interview time limit reached</AlertDialogTitle>
            <AlertDialogDescription>
              Your 20-minute session has elapsed. Submit now to generate your final performance evaluation and question-by-question breakdown.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              autoFocus
              disabled={submittingAnswer}
              onClick={handleTimeUpConclude}
            >
              {submittingAnswer ? "Generating Report..." : "View Final Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default InterviewPage;
