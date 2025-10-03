import { useState, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { JobSearchResult, ExtractedJob } from "@/lib/db/dynamodb.service";
import { fetchWithAnonymousRetry } from "@/lib/auth/anonymous-client";

export interface StreamedJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
}

export interface SearchStreamState {
  isSearching: boolean;
  sessionId: string | null;
  debugUrl?: string;
  jobs: StreamedJobResult[];
  status: "idle" | "searching" | "completed" | "error";
  statusMessage?: string;
  error?: string;
  totalJobsFound: number;
}

export function useJobSearchStream() {
  const { storage, userId, isAnonymous } = useAuth();
  const queryClient = useQueryClient();
  const resultsQueryKey = useMemo<(string | undefined)[]>(
    () => [
      "jobSearchResults",
      isAnonymous ? "anonymous" : userId ?? "authenticated",
    ],
    [isAnonymous, userId]
  );
  const [state, setState] = useState<SearchStreamState>({
    isSearching: false,
    sessionId: null,
    jobs: [],
    status: "idle",
    totalJobsFound: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const startSearch = useCallback(
    async (keywords: string, location: string, jobBoard: string) => {
      // Reset state
      setState({
        isSearching: true,
        sessionId: null,
        jobs: [],
        status: "searching",
        totalJobsFound: 0,
      });

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        // Start SSE connection
        const response = await fetchWithAnonymousRetry(
          "/api/wallcrawler/search/stream",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ keywords, location, jobBoard }),
            signal: abortControllerRef.current.signal,
          },
          { skipRefresh: !isAnonymous }
        );

        if (response.status === 401) {
          throw new Error(
            "Authentication required. Please refresh the page or sign in."
          );
        }

        if (!response.ok) {
          throw new Error("Failed to start search");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Process the stream
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));

                switch (event.type) {
                  case "session_started":
                    setState((prev) => ({
                      ...prev,
                      sessionId: event.sessionId,
                      debugUrl: event.debugUrl,
                      statusMessage: "Search started...",
                    }));
                    break;

                  case "job_found": {
                    const newJob = event.job;
                    setState((prev) => ({
                      ...prev,
                      jobs: [...prev.jobs, newJob],
                      totalJobsFound: prev.totalJobsFound + 1,
                    }));

                    // For anonymous users, save to localStorage immediately
                    if (isAnonymous && storage && state.sessionId) {
                      const jobResult: JobSearchResult = {
                        userId: userId || "anonymous",
                        searchId: state.sessionId,
                        boardName: jobBoard,
                        sessionId: state.sessionId,
                        jobs: [
                          ...state.jobs,
                          {
                            jobId: `${state.sessionId}_${event.index}_${Date.now()}`,
                            ...newJob,
                          },
                        ] as ExtractedJob[],
                        status: "running",
                        totalJobsFound: state.totalJobsFound + 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      };

                      if (state.jobs.length === 0) {
                        await storage.saveJobSearchResults(jobResult);
                      } else {
                        await storage.updateJobSearchResults(state.sessionId, {
                          jobs: jobResult.jobs,
                          totalJobsFound: jobResult.totalJobsFound,
                          updatedAt: jobResult.updatedAt,
                        });
                      }

                      queryClient.setQueryData<JobSearchResult[] | undefined>(
                        resultsQueryKey,
                        (prev) => {
                          const existing = prev ?? [];
                          const withoutCurrent = existing.filter(
                            (r) => r.searchId !== jobResult.searchId
                          );
                          return [...withoutCurrent, jobResult];
                        }
                      );
                    }
                    break;
                  }

                  case "status_update":
                    setState((prev) => ({
                      ...prev,
                      statusMessage: event.message,
                    }));
                    break;

                  case "complete":
                    setState((prev) => ({
                      ...prev,
                      status: "completed",
                      isSearching: false,
                      statusMessage: `Found ${event.totalJobs} jobs`,
                    }));

                    // For anonymous users, mark as completed in localStorage
                    if (isAnonymous && storage && event.sessionId) {
                      const updatedAt = new Date().toISOString();
                      await storage.updateJobSearchResults(event.sessionId, {
                        status: "completed",
                        updatedAt,
                      });

                      queryClient.setQueryData<JobSearchResult[] | undefined>(
                        resultsQueryKey,
                        (prev) => {
                          const existing = prev ?? [];
                          return existing.map((result) =>
                            result.searchId === event.sessionId
                              ? { ...result, status: "completed", updatedAt }
                              : result
                          );
                        }
                      );
                    }
                    break;

                  case "error":
                    setState((prev) => ({
                      ...prev,
                      status: "error",
                      isSearching: false,
                      error: event.error,
                    }));
                    break;
                }
              } catch (e) {
                console.error("Failed to parse SSE event:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Search stream error:", error);
        setState((prev) => ({
          ...prev,
          status: "error",
          isSearching: false,
          error: error instanceof Error ? error.message : "Search failed",
        }));
      }
    },
    [
      storage,
      userId,
      isAnonymous,
      state.sessionId,
      state.jobs,
      state.totalJobsFound,
      queryClient,
      resultsQueryKey,
    ]
  );

  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isSearching: false,
      status: "idle",
    }));
  }, []);

  return {
    ...state,
    startSearch,
    cancelSearch,
  };
}
