"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface SessionDetails {
  id: string;
  status: "RUNNING" | "COMPLETED" | "ERROR" | "TIMED_OUT";
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  endedAt?: string;
  region: string;
  userMetadata?: Record<string, unknown>;
  connectUrl?: string;
}

interface JobResult {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
  source: string;
  postedDate?: string;
}

interface ActionLog {
  id: string;
  sessionId: string;
  timestamp: string;
  action: string;
  type:
    | "act"
    | "extract"
    | "observe"
    | "navigate"
    | "scroll"
    | "error"
    | "info"
    | "debug";
  details?: string;
  status: "pending" | "success" | "error";
}

export function useSessionDetails(sessionId: string) {
  const { data: authSession } = useSession();
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return;

    const connectSSE = () => {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Build URL with auth headers if needed
      const url = `/api/wallcrawler/sessions/${sessionId}/stream`;

      // For anonymous users, add token as query param since EventSource doesn't support headers
      const anonToken = localStorage.getItem("anonToken");
      const finalUrl =
        anonToken && !authSession?.user ? `${url}?anonToken=${anonToken}` : url;

      const eventSource = new EventSource(finalUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsLoading(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "session":
              if (message.data) {
                setSession(message.data);
              }
              break;
            case "jobs":
              setJobs(message.data);
              break;
            case "totalJobs":
              setTotalJobs(message.data);
              break;
            case "logs-history":
              setActionLogs(message.data);
              break;
            case "log":
              // Append single new log
              setActionLogs((prev) => [...prev, message.data]);
              break;
            case "jobs-update":
              // Replace jobs with updated list
              setJobs(message.data);
              break;
            case "totalJobs-update":
              setTotalJobs(message.data);
              break;
            case "error":
              setError(message.data.message);
              if (message.data.message === "Unauthorized") {
                eventSource.close();
              }
              break;
          }
        } catch (err) {
          console.error("Failed to parse SSE message:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE error:", err);
        eventSource.close();

        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          setError(`Connection lost. Reconnecting in ${delay / 1000}s...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectSSE();
          }, delay);
        } else {
          setError("Connection lost. Please refresh the page.");
          setIsLoading(false);
        }
      };
    };

    connectSSE();

    // Cleanup on unmount or sessionId change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId, authSession?.user]);

  // No refresh function needed - SSE is always live
  const refreshSession = () => {
    // Reconnect SSE if needed
    if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
      reconnectAttemptsRef.current = 0;
      const connectSSE = () => {
        const url = `/api/wallcrawler/sessions/${sessionId}/stream`;
        const anonToken = localStorage.getItem("anonToken");
        const finalUrl =
          anonToken && !authSession?.user
            ? `${url}?anonToken=${anonToken}`
            : url;

        const eventSource = new EventSource(finalUrl);
        eventSourceRef.current = eventSource;
        // ... rest of the connection logic from above
      };
      connectSSE();
    }
  };

  // Pagination happens client-side
  const paginatedJobs = jobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return {
    session,
    jobs: paginatedJobs,
    actionLogs,
    isLoading,
    error,
    refreshSession,
    totalJobs,
    currentPage,
    setCurrentPage,
    pageSize,
  };
}
