import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

export interface SessionDetails {
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

export interface SessionJobResult {
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

export interface SessionActionLog {
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

interface SessionQueryData {
  session: SessionDetails | null;
  jobs: SessionJobResult[];
  actionLogs: SessionActionLog[];
  totalJobs: number;
}

const INITIAL_SESSION_DATA: SessionQueryData = {
  session: null,
  jobs: [],
  actionLogs: [],
  totalJobs: 0,
};

export function useSessionDetails(sessionId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["sessionDetails", sessionId], [sessionId]);

  const { data: sessionData = INITIAL_SESSION_DATA } = useQuery<SessionQueryData>(
    {
      queryKey,
      initialData: INITIAL_SESSION_DATA,
      enabled: false,
      // No backing REST endpoint yet; SSE populates the cache.
      queryFn: async () => INITIAL_SESSION_DATA,
    }
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectSSERef = useRef<() => void>(() => {});

  const resetSessionData = useCallback(() => {
    queryClient.setQueryData<SessionQueryData>(queryKey, INITIAL_SESSION_DATA);
  }, [queryClient, queryKey]);

  useEffect(() => {
    if (!sessionId) {
      resetSessionData();
      setIsLoading(false);
      return;
    }

    resetSessionData();
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const url = `/api/wallcrawler/sessions/${sessionId}/stream`;
      const anonToken = localStorage.getItem("anonToken");
      const finalUrl = anonToken && !user ? `${url}?anonToken=${anonToken}` : url;

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
                queryClient.setQueryData<SessionQueryData>(queryKey, (prev) => {
                  const base = prev ?? INITIAL_SESSION_DATA;
                  return {
                    ...base,
                    session: message.data,
                  };
                });
              }
              break;
            case "jobs":
            case "jobs-update":
              queryClient.setQueryData<SessionQueryData>(queryKey, (prev) => {
                const base = prev ?? INITIAL_SESSION_DATA;
                return {
                  ...base,
                  jobs: message.data ?? [],
                };
              });
              break;
            case "totalJobs":
            case "totalJobs-update":
              queryClient.setQueryData<SessionQueryData>(queryKey, (prev) => {
                const base = prev ?? INITIAL_SESSION_DATA;
                return {
                  ...base,
                  totalJobs: message.data ?? 0,
                };
              });
              break;
            case "logs-history":
              queryClient.setQueryData<SessionQueryData>(queryKey, (prev) => {
                const base = prev ?? INITIAL_SESSION_DATA;
                return {
                  ...base,
                  actionLogs: message.data ?? [],
                };
              });
              break;
            case "log":
              queryClient.setQueryData<SessionQueryData>(queryKey, (prev) => {
                const base = prev ?? INITIAL_SESSION_DATA;
                return {
                  ...base,
                  actionLogs: [...base.actionLogs, message.data],
                };
              });
              break;
            case "error":
              setError(message.data.message ?? "Session error");
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

    connectSSERef.current = connectSSE;
    connectSSE();

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
  }, [sessionId, user, queryClient, queryKey, resetSessionData]);

  const refreshSession = () => {
    reconnectAttemptsRef.current = 0;
    setIsLoading(true);
    setError(null);
    if (connectSSERef.current) {
      connectSSERef.current();
    }
  };

  const paginatedJobs = sessionData.jobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return {
    session: sessionData.session,
    jobs: paginatedJobs,
    actionLogs: sessionData.actionLogs,
    isLoading,
    error,
    refreshSession,
    totalJobs: sessionData.totalJobs,
    currentPage,
    setCurrentPage,
    pageSize,
  };
}
