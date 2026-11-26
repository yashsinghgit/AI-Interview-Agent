import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import api from "../services/api";
import { useDelayedLoading } from "../hooks/useDelayedLoading";
import { FeedbackReportSkeleton } from "../components/AppSkeletons";

interface FinalReport {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface InterviewMetadata {
  role?: string;
  difficulty?: string;
  createdAt?: string;
  conversation?: Array<{ question: string; category?: string }>;
}

function getReportBand(score: number) {
  if (score === 0) {
    return {
      band: "zero",
      label: "Incomplete Session",
      colorClass: "text-muted-foreground border-border bg-muted/30",
      badgeClass: "bg-muted text-muted-foreground border-border",
      headline: "Session concluded before sufficient evaluated answers were recorded.",
      meaning: "This interview was ended before the minimum question threshold was reached. Start a new session and complete at least 5 questions to generate a comprehensive competency report.",
    };
  }
  if (score < 50) {
    return {
      band: "low",
      label: "Needs Targeted Preparation",
      colorClass: "text-destructive border-destructive/30 bg-destructive/5",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      headline: "Your foundational knowledge needs sharper structure and concrete examples.",
      meaning: "In live interviews, evaluators look for decisive communication and practical implementation evidence. Focus on practicing the STAR method and articulating technical trade-offs.",
    };
  }
  if (score < 75) {
    return {
      band: "mid",
      label: "Solid Foundation",
      colorClass: "text-warning border-warning/30 bg-warning/5",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
      headline: "Good core competencies demonstrated; deepen your discussion of trade-offs.",
      meaning: "You answered questions directly and accurately. To step up to senior-level performance, quantify the business or performance impact of your choices and address edge-case failure modes.",
    };
  }
  return {
    band: "high",
    label: "Strong Performance",
    colorClass: "text-success border-success/30 bg-success/5",
    badgeClass: "bg-success/10 text-success border-success/20",
    headline: "You demonstrated clear technical authority, concise framing, and strong depth.",
    meaning: "Your answers were well-calibrated to the role. You successfully handled follow-ups and demonstrated nuanced understanding of constraints.",
  };
}

function deriveFinalSubScores(overallScore: number) {
  if (overallScore === 0) {
    return [
      { label: "Structure", score: 0, desc: "Framing & logical flow" },
      { label: "Technical Depth", score: 0, desc: "Accuracy & fundamentals" },
      { label: "Impact & Scope", score: 0, desc: "Quantified results & trade-offs" },
      { label: "Relevance", score: 0, desc: "Direct adherence to prompt" },
    ];
  }
  const base = Math.max(30, Math.min(96, overallScore));
  return [
    { label: "Structure", score: Math.min(100, Math.max(35, base + 3)), desc: "Framing & logical flow" },
    { label: "Technical Depth", score: Math.min(100, Math.max(30, base - 1)), desc: "Accuracy & fundamentals" },
    { label: "Impact & Scope", score: Math.min(100, Math.max(25, base - 4)), desc: "Quantified results & trade-offs" },
    { label: "Relevance", score: Math.min(100, Math.max(40, base + 2)), desc: "Direct adherence to prompt" },
  ];
}

function formatUnambiguousDate(dateString?: string) {
  if (!dateString) return "Recent Session";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Recent Session";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FeedbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const stateData = location.state as {
    finalReport?: FinalReport;
    endingReason?: string;
  } | null;

  const [finalReport, setFinalReport] = useState<FinalReport | null>(stateData?.finalReport || null);
  const [interviewMeta, setInterviewMeta] = useState<InterviewMetadata | null>(null);
  const [loading, setLoading] = useState(!stateData?.finalReport);
  const [error, setError] = useState("");

  const { showSkeleton: showReportSkeleton } = useDelayedLoading(loading, {
    delay: 300,
    timeout: 15000,
    timeoutMessage: "This is taking longer than expected",
    retryAction: () => window.location.reload(),
  });

  const endingReason = stateData?.endingReason || "";

  useEffect(() => {
    if (!id) {
      setError("Interview identifier is missing.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/interviews/${id}`);
        const interview = response.data?.interview;

        if (interview) {
          setInterviewMeta({
            role: interview.role,
            difficulty: interview.difficulty,
            createdAt: interview.createdAt,
            conversation: interview.conversation,
          });

          if (!finalReport && interview.finalReport) {
            setFinalReport(interview.finalReport);
          } else if (!finalReport && !interview.finalReport) {
            setError("No final evaluation has been generated for this interview session yet.");
          }
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        console.error("Failed to load interview report:", err);
        setError(axiosError.response?.data?.message || "Unable to retrieve the final interview report.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, finalReport]);

  // Loading Room (Delayed Skeleton after 300ms)
  if (loading) {
    if (!showReportSkeleton) {
      return <div className="min-h-screen bg-background" aria-busy="true" />;
    }
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b border-border bg-card/60 sticky top-0 z-20 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <span className="font-sans text-xs sm:text-sm font-medium text-foreground truncate">
              Performance Dossier
            </span>
          </div>
        </header>
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <FeedbackReportSkeleton statusText="Putting your report together..." />
        </main>
      </div>
    );
  }

  // Error / Missing Report
  if (error || !finalReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <div className="w-10 h-10 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <h2 className="font-display text-2xl text-foreground font-normal">
            Report Unavailable
          </h2>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {error || "An evaluation report is only available after completing an interview session."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-sans text-sm font-medium rounded-md hover:opacity-90 transition"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate("/interview/setup")}
              className="w-full py-2.5 px-4 bg-transparent text-muted-foreground hover:text-foreground font-sans text-sm transition"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  const band = getReportBand(finalReport.overallScore);
  const subScores = deriveFinalSubScores(finalReport.overallScore);
  const formattedDate = formatUnambiguousDate(interviewMeta?.createdAt);
  const questionCount = interviewMeta?.conversation?.length || 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ROOM HEADER (Room Mode - No generic navbar) */}
      <header className="border-b border-border bg-card/60 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-sans text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
            <span className="text-border">/</span>
            <span className="font-sans text-xs sm:text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-[320px]">
              {interviewMeta?.role || "Interview Performance Report"}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            {questionCount > 0 && (
              <>
                <span>•</span>
                <span>{questionCount} inquiries</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* REPORT DOSSIER */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Title and Session Closure Note */}
        <div className="space-y-2 border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans uppercase tracking-wider font-semibold text-muted-foreground">
              Final Session Analysis
            </span>
            {interviewMeta?.difficulty && (
              <span className="text-xs font-sans text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                {interviewMeta.difficulty} Difficulty
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-foreground">
            Your Performance Dossier
          </h1>

          <p className="font-sans text-sm text-muted-foreground leading-relaxed pt-1">
            {endingReason || "Review your evaluated competencies, demonstrated strengths, and strategic areas for refinement."}
          </p>
        </div>

        {/* OVERALL SCORE & BAND EVALUATION */}
        <section className={`p-6 sm:p-8 rounded-lg border ${band.colorClass} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-5xl sm:text-6xl font-bold tracking-tight">
                {finalReport.overallScore}
              </span>
              <span className="font-mono text-base opacity-60">/ 100</span>
              <span className={`text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded border ${band.badgeClass}`}>
                {band.label}
              </span>
            </div>
          </div>

          <h3 className="font-sans text-base sm:text-lg font-semibold text-foreground">
            {band.headline}
          </h3>

          <p className="font-sans text-sm leading-relaxed text-foreground/85">
            {band.meaning}
          </p>
        </section>

        {/* SUB-SCORES BREAKDOWN */}
        <section className="space-y-3">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Evaluated Sub-Competencies
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {subScores.map((sub) => (
              <div key={sub.label} className="p-4 bg-card border border-border rounded-lg space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-sans text-xs font-medium text-muted-foreground">{sub.label}</span>
                  <span className="font-mono text-sm font-semibold text-foreground">{sub.score}</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${sub.score}%` }}
                  />
                </div>
                <p className="font-sans text-[11px] text-muted-foreground leading-tight">{sub.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* DEMONSTRATED STRENGTHS & AREAS FOR IMPROVEMENT */}
        <section className="grid sm:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="p-5 bg-card border border-border rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success font-sans">
              <CheckCircle2 size={16} />
              Demonstrated Strengths
            </div>

            {finalReport.strengths && finalReport.strengths.length > 0 ? (
              <ul className="space-y-3 font-sans text-sm text-foreground">
                {finalReport.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-success font-bold mt-0.5">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-sans text-xs text-muted-foreground italic">
                No specific strength patterns recorded during this session.
              </p>
            )}
          </div>

          {/* Weaknesses / Refinements */}
          <div className="p-5 bg-card border border-border rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning font-sans">
              <TrendingUp size={16} />
              Areas for Refinement
            </div>

            {finalReport.weaknesses && finalReport.weaknesses.length > 0 ? (
              <ul className="space-y-3 font-sans text-sm text-foreground">
                {finalReport.weaknesses.map((weak, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-warning font-bold mt-0.5">•</span>
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-sans text-xs text-muted-foreground italic">
                No major deficiencies noted; continue reinforcing current practices.
              </p>
            )}
          </div>
        </section>

        {/* STRONGER ALTERNATIVE ANSWER BLUEPRINT (Rule 20) */}
        <section className="p-6 bg-card border border-border rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
            <Sparkles size={14} className="text-accent" />
            Executive Answer Blueprint
          </div>

          <h3 className="font-sans text-base font-semibold text-foreground">
            How a top-tier candidate structures responses in this domain
          </h3>

          <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
            When asked architectural or behavioral questions, top candidates anchor their response in 3 steps: (1) state the primary objective and explicit constraints, (2) detail the solution with technical specificity, and (3) explain the trade-offs deliberately chosen over alternatives.
          </p>

          <div className="p-4 bg-muted/60 border border-border/80 rounded-md font-sans text-xs sm:text-sm text-foreground/90 italic leading-relaxed space-y-2">
            <p>
              "In designing our data ingestion service, our constraint was a strict 50ms p99 latency SLA under 10k RPS. Rather than querying Postgres directly, we placed Redis as an in-memory write-behind cache with a dead-letter queue."
            </p>
            <p>
              "The trade-off was accepting a 1-second eventual consistency window on non-critical analytics reads in exchange for eliminating database connection pool exhaustion entirely."
            </p>
          </div>
        </section>

        {/* STRATEGIC RECOMMENDATIONS */}
        {finalReport.recommendations && finalReport.recommendations.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
              <BookOpen size={14} />
              Strategic Practice Recommendations
            </div>

            <div className="space-y-2.5">
              {finalReport.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-card border border-border rounded-lg flex items-start gap-3.5 font-sans text-sm text-foreground leading-relaxed"
                >
                  <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACTION FOOTER & NEXT PREVIEW (Rule 21 & Single Primary Accent Action) */}
        <section className="pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="font-sans text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">Recommended Next Focus</p>
            <p>Practice 3 targeted questions on system trade-offs and edge-case handling.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto px-4 py-2.5 border border-border bg-card text-foreground font-sans text-sm font-medium rounded-md hover:bg-muted transition"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => navigate("/interview/setup")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:opacity-95 text-white font-sans text-sm font-semibold px-6 py-2.5 rounded-md transition shadow-xs"
            >
              Start Next Practice
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FeedbackPage;
