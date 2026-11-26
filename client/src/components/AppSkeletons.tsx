import { Skeleton } from "./ui/skeleton";

export function InterviewQuestionSkeleton({ statusText }: { statusText?: string }) {
  return (
    <div
      className="space-y-10 animate-in fade-in duration-200"
      aria-busy="true"
      role="region"
      aria-label="Loading next interview question"
    >
      {/* 1. INTERVIEWER TURN SKELETON */}
      <div className="bg-muted/50 border border-border/80 rounded-xl p-5 sm:p-7">
        <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 md:gap-6 items-start">
          <div className="pt-1">
            <Skeleton className="h-4 w-20" />
          </div>

          <div className="space-y-3">
            {/* Status text */}
            <p
              className="font-sans text-xs text-muted-foreground leading-normal"
              aria-live="polite"
            >
              {statusText || "Preparing your next question..."}
            </p>

            {/* Question lines mirroring ~28px Newsreader */}
            <div className="space-y-2.5 pt-1">
              <Skeleton className="h-7 w-full max-w-2xl" />
              <Skeleton className="h-7 w-4/5" />
            </div>

            {/* Resume chip skeleton */}
            <div className="pt-1">
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. CANDIDATE TURN SKELETON (mirroring exact layout) */}
      <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 md:gap-6 items-start pt-2">
        <div className="pt-3">
          <Skeleton className="h-4 w-10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_210px] gap-6 items-start">
          {/* Answer Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-[210px] w-full rounded-lg" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
            </div>
          </div>

          {/* STAR Framework Card */}
          <div className="p-4 bg-support-tint border border-border rounded-lg space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedbackReportSkeleton({ statusText }: { statusText?: string }) {
  return (
    <div
      className="space-y-10 animate-in fade-in duration-200 max-w-3xl w-full mx-auto"
      aria-busy="true"
      role="region"
      aria-label="Loading evaluation report"
    >
      {/* Title section */}
      <div className="space-y-3 border-b border-border pb-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-3/4 max-w-md" />
        <p
          className="font-sans text-xs text-muted-foreground leading-normal"
          aria-live="polite"
        >
          {statusText || "Putting your report together..."}
        </p>
      </div>

      {/* Main Score Card Skeleton */}
      <div className="p-6 sm:p-8 rounded-lg border border-border bg-card space-y-4">
        <div className="flex items-baseline gap-3">
          <Skeleton className="h-14 w-20" />
          <Skeleton className="h-6 w-32 rounded" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* 4 Sub-competencies tiles */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-card border border-border rounded-lg space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-card border border-border rounded-lg space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="p-5 bg-card border border-border rounded-lg space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="space-y-10 animate-in fade-in duration-200"
      aria-busy="true"
      role="region"
      aria-label="Loading dashboard data"
    >
      {/* 4 Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-2.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* 5 Interview Rows */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.8fr_1fr] gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <div className="flex justify-end">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* 5 Rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="grid md:grid-cols-[1.5fr_1fr_0.8fr_1fr] gap-4 items-center px-6 py-5 border-b border-gray-100 last:border-b-0"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <div className="flex items-center justify-end gap-3">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SetupFullscreenLoading() {
  return (
    <div
      className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
      aria-busy="true"
      role="region"
      aria-label="Preparing interview session"
    >
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-10 h-10 mx-auto border-2 border-border border-t-foreground rounded-full animate-spin" />
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-foreground font-normal">
            Preparing your interview room
          </h2>
          <p
            className="font-sans text-xs text-muted-foreground leading-relaxed"
            aria-live="polite"
          >
            Reading your resume and the job description...
          </p>
        </div>
      </div>
    </div>
  );
}
