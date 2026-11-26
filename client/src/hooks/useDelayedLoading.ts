import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UseDelayedLoadingOptions {
  delay?: number; // default 300ms
  timeout?: number; // default 15000ms
  onTimeout?: () => void;
  timeoutMessage?: string;
  retryAction?: () => void;
}

export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {}
) {
  const {
    delay = 300,
    timeout = 15000,
    onTimeout,
    timeoutMessage = "This is taking longer than expected",
    retryAction,
  } = options;

  const [showSkeleton, setShowSkeleton] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setHasTimedOut(false);

      // Only show skeleton if loading lasts longer than 300ms
      delayTimerRef.current = setTimeout(() => {
        setShowSkeleton(true);
      }, delay);

      // Trigger timeout alert after 15s
      timeoutTimerRef.current = setTimeout(() => {
        setHasTimedOut(true);
        if (onTimeout) {
          onTimeout();
        }
        toast.error(timeoutMessage, {
          duration: 6000,
          action: retryAction
            ? {
                label: "Retry",
                onClick: retryAction,
              }
            : undefined,
        });
      }, timeout);
    } else {
      setShowSkeleton(false);
      setHasTimedOut(false);
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    }

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [isLoading, delay, timeout, timeoutMessage, onTimeout, retryAction]);

  return { showSkeleton, hasTimedOut };
}
