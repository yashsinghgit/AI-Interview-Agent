import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Briefcase, FileText, ArrowRight, Sparkles, Upload, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api from "../services/api";
import { parseResumeFile } from "../utils/resumeParser";
import { useDelayedLoading } from "../hooks/useDelayedLoading";
import { SetupFullscreenLoading } from "../components/AppSkeletons";

type ResumeState = "idle" | "drag-over" | "parsing" | "parsed" | "error";

function InterviewSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [jobDescription, setJobDescription] = useState("");

  // Retrieve resumeText purely from in-memory navigation state (never localStorage)
  const [resumeText, setResumeText] = useState<string>(() => {
    const navState = location.state as { resumeText?: string } | null;
    return navState?.resumeText || "";
  });

  const [hasSavedResume, setHasSavedResume] = useState<boolean>(() => {
    const navState = location.state as { resumeText?: string } | null;
    return Boolean(navState?.resumeText);
  });

  const [fileName, setFileName] = useState<string>(() => {
    const navState = location.state as { resumeText?: string; fileName?: string } | null;
    if (navState?.fileName) return navState.fileName;
    if (navState?.resumeText) return "Saved Resume";
    return "";
  });

  const [resumeState, setResumeState] = useState<ResumeState>(() => {
    const navState = location.state as { resumeText?: string } | null;
    return navState?.resumeText ? "parsed" : "idle";
  });

  const [showPasteArea, setShowPasteArea] = useState<boolean>(false);
  const [showPreviewText, setShowPreviewText] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Purge any legacy plaintext resume stored in localStorage on mount
  useEffect(() => {
    localStorage.removeItem("resumeText");
  }, []);

  const handleProcessFile = async (file: File) => {
    setResumeState("parsing");
    try {
      const result = await parseResumeFile(file);
      setResumeText(result.text);
      setFileName(result.fileName);
      setHasSavedResume(false);
      setResumeState("parsed");
      toast.success("Resume parsed successfully in browser.", { duration: 4000 });
    } catch (err: unknown) {
      setResumeState("error");
      const message = (err as Error)?.message || "Failed to parse resume.";
      toast.error(message, {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => fileInputRef.current?.click(),
        },
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (resumeState !== "parsing") {
      setResumeState("drag-over");
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (resumeState === "drag-over") {
      setResumeState(resumeText ? "parsed" : "idle");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) {
      setResumeState(resumeText ? "parsed" : "idle");
      return;
    }
    handleProcessFile(droppedFile);
  };

  const handleRemoveResume = () => {
    setResumeText("");
    setFileName("");
    setHasSavedResume(false);
    setResumeState("idle");
    setShowPreviewText(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const [loading, setLoading] = useState(false);

  const { showSkeleton: showFullscreenLoading } = useDelayedLoading(loading, {
    delay: 300,
    timeout: 15000,
    timeoutMessage: "This is taking longer than expected",
    retryAction: () => handleCreateInterview(),
  });

  const handleCreateInterview = async () => {
    if (!role || !jobDescription) {
      toast.error("Please enter the role and job description.", {
        duration: 4000,
      });
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/interviews", {
        role,
        difficulty,
        jobDescription,
        resumeText,
      });

      const interviewId = response.data.interview._id;

      navigate(`/interview/${interviewId}`);
    } catch (error: unknown) {
      console.error("CREATE INTERVIEW ERROR:", error);
      const axiosError = error as AxiosError<{ message?: string }>;
      const reason =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to create interview.";

      toast.error(reason, {
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => handleCreateInterview(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-between">
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
            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
              <Sparkles size={23} className="text-blue-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Create Your AI Interview
            </h1>

            <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
              Customize your interview with your target role, job description,
              difficulty, and resume.
            </p>
          </div>

          {/* Setup Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
            {/* Job Role */}
            <div className="mb-6">
              <label
                htmlFor="role"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
              >
                <Briefcase size={17} className="text-blue-600" />
                Job Role
              </label>

              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label
                htmlFor="difficulty"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Difficulty
              </label>

              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <p className="text-xs text-gray-400 mt-2">
                Choose the level that best matches your preparation needs.
              </p>
            </div>

            {/* Job Description */}
            <div className="mb-6">
              <label
                htmlFor="jobDescription"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
              >
                <FileText size={17} className="text-blue-600" />
                Job Description
              </label>

              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={7}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 leading-relaxed resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />

              <p className="text-xs text-gray-400 mt-2">
                The AI will use this to tailor questions to the role.
              </p>
            </div>

            {/* Resume Section */}
            <div className="mb-6 font-sans">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText size={17} className="text-blue-600" />
                  Resume (optional)
                </label>

                {!showPasteArea && (
                  <button
                    type="button"
                    onClick={() => setShowPasteArea(true)}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition"
                  >
                    Paste text instead
                  </button>
                )}
                {showPasteArea && (
                  <button
                    type="button"
                    onClick={() => setShowPasteArea(false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition"
                  >
                    Upload file instead
                  </button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) {
                    handleProcessFile(selected);
                  }
                }}
              />

              {/* Paste Text Mode */}
              {showPasteArea ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Direct text paste</span>
                    <span>{resumeText.length.toLocaleString()} / 50,000</span>
                  </div>
                  <textarea
                    id="resumeText"
                    value={resumeText}
                    maxLength={50000}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      if (e.target.value) {
                        setResumeState("parsed");
                        if (!fileName) setFileName("Pasted Resume");
                      } else {
                        setResumeState("idle");
                      }
                    }}
                    placeholder="Paste your plain text resume here..."
                    rows={6}
                    className="w-full border border-border bg-card rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground leading-relaxed resize-none outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your resume text stays in memory and is securely submitted with your interview to personalize questions.
                  </p>
                </div>
              ) : (
                /* Upload Area / Parsed Chip Mode */
                <div className="space-y-3">
                  {/* State: Parsed or Saved Resume preselection */}
                  {resumeText && resumeState !== "parsing" ? (
                    <div className="border border-border bg-card rounded-lg p-4 space-y-3 shadow-xs">
                      {hasSavedResume && (
                        <div className="flex items-center justify-between pb-2 border-b border-border text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Using your saved resume</span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-accent hover:underline font-mono uppercase tracking-wider"
                          >
                            Change
                          </button>
                        </div>
                      )}

                      {/* File chip */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/60 border border-border/80 rounded-md p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={20} className="text-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[220px] sm:max-w-[320px]">
                              {fileName || "resume-document"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                              <span className="text-success font-medium uppercase text-[10px] tracking-wider">Parsed</span>
                              <span>•</span>
                              <span>{resumeText.length.toLocaleString()} chars</span>
                            </div>
                          </div>
                        </div>

                        {/* Chip actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="min-h-[44px] px-3 text-xs font-mono uppercase tracking-wider text-foreground hover:bg-card border border-border rounded-md transition focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveResume}
                            className="min-h-[44px] px-3 text-xs font-mono uppercase tracking-wider text-destructive hover:bg-destructive/10 border border-transparent rounded-md transition focus:outline-none focus:ring-2 focus:ring-destructive"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Collapsed Preview toggle */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowPreviewText((prev) => !prev)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-sans transition py-1 focus:outline-none"
                        >
                          {showPreviewText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <span>{showPreviewText ? "Hide preview text" : "Preview text"}</span>
                        </button>

                        {showPreviewText && (
                          <div className="mt-2 max-h-48 overflow-y-auto border border-border bg-background rounded-md p-3 font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap select-text">
                            {resumeText}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* State: Idle / Drag-over / Parsing */
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${
                        resumeState === "drag-over"
                          ? "border-accent bg-accent/5"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      {resumeState === "parsing" ? (
                        <div className="flex flex-col items-center justify-center py-4 gap-2">
                          <Loader2 size={24} className="animate-spin text-accent" />
                          <p className="text-sm font-medium text-foreground">
                            Reading your resume...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Extracting text directly in your browser
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                            <Upload size={18} />
                          </div>

                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground font-sans text-xs font-semibold uppercase tracking-wider rounded-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
                            >
                              Upload resume
                            </button>
                            <p className="text-xs text-muted-foreground pt-1">
                              or drag and drop your file here
                            </p>
                          </div>

                          <p className="text-[11px] text-muted-foreground font-mono">
                            PDF or DOCX. Parsed in your browser. (Max 5 MB)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Create Interview */}
            <button
              type="button"
              onClick={handleCreateInterview}
              disabled={loading}
              className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reading your resume and the job description...</span>
                </>
              ) : (
                <>
                  <span>Create Interview</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="mt-5 text-center">
            <p className="text-xs text-gray-400">
              Your interview will be personalized using the information
              provided above.
            </p>
          </div>
        </div>
      </main>

      {/* Full-screen Loading State after 300ms */}
      {loading && showFullscreenLoading && <SetupFullscreenLoading />}
    </div>
  );
}

export default InterviewSetupPage;