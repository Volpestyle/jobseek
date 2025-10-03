import { useCallback, useMemo } from "react";
import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

interface SessionDetails {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  region: string;
  keywords: string;
  location: string;
  jobBoard: string;
}

interface ListSessionsResponse {
  sessions: SessionDetails[];
}

interface ResumeSessionResponse {
  sessionId: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  debugUrl?: string;
  debuggerFullscreenUrl?: string;
  connectUrl?: string;
  userMetadata?: Record<string, unknown>;
}

interface SearchJobsResponse {
  jobs: JobResult[];
}

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  salary?: string;
  postedDate?: string;
  source: string;
}

interface JobDetails {
  title: string;
  company: string;
  location: string;
  description?: string;
  requirements?: string[];
  benefits?: string[];
  salary?: string;
  type?: "full-time" | "part-time" | "contract" | "internship";
  remote?: boolean;
}

interface ApplyToJobResponse {
  success: true;
  message: string;
  applicationId?: string;
}

interface UseAnonymousSessionReturn {
  anonymousId: string | null;
  isLoading: boolean;
  error: string | null;
  resumeSession: (sessionId: string) => Promise<ResumeSessionResponse>;
  listSessions: () => Promise<SessionDetails[]>;
  searchJobs: (params: {
    keywords: string;
    location: string;
    jobBoard: string;
    saveSearch?: boolean;
    searchName?: string;
  }) => Promise<SearchJobsResponse>;
  applyToJob: (params: {
    sessionId: string;
    jobUrl: string;
    jobDetails: JobDetails;
    resumeS3Key?: string;
    coverLetter?: string;
  }) => Promise<ApplyToJobResponse>;
  isInitialized: boolean;
}

async function ensureAnonymousToken(): Promise<boolean> {
  const response = await fetch("/api/auth/anonymous");

  if (!response.ok) {
    const message = await safeErrorMessage(response);
    throw new Error(message || "Failed to get anonymous token");
  }

  const data = await response.json();
  return data.success === true;
}

async function safeErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    if (data && typeof data === "object" && "error" in data) {
      return typeof data.error === "string" ? data.error : null;
    }
  } catch (error) {
    console.error("Failed to parse error response:", error);
  }
  return null;
}

export function useAnonymousSession(): UseAnonymousSessionReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const tokenQueryKey = useMemo(
    () => ["anonymousToken", isAuthenticated ? user?.id ?? "authenticated" : "anonymous"],
    [isAuthenticated, user?.id]
  );

  const {
    data: hasAnonymousToken,
    isLoading: tokenLoading,
    isFetching: tokenFetching,
    isError: tokenIsError,
    error: tokenError,
    isFetched: tokenFetched,
    refetch: refetchAnonymousToken,
  } = useQuery({
    queryKey: tokenQueryKey,
    queryFn: ensureAnonymousToken,
    enabled: !authLoading && !isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const ensureReady = useCallback(async () => {
    if (authLoading) {
      throw new Error("Authentication state not ready");
    }

    if (isAuthenticated) {
      return;
    }

    if (hasAnonymousToken) {
      return;
    }

    const result = await refetchAnonymousToken();
    if (!result.data) {
      throw new Error("Anonymous session initialization failed");
    }
  }, [authLoading, isAuthenticated, hasAnonymousToken, refetchAnonymousToken]);

  const sessionsQueryKey = useMemo(
    () => ["anonymousSessions", isAuthenticated ? user?.id ?? "authenticated" : "anonymous"],
    [isAuthenticated, user?.id]
  );

  const {
    refetch: refetchSessions,
    data: cachedSessions,
    isFetching: sessionsFetching,
    error: sessionsError,
  } = useQuery<SessionDetails[]>({
    queryKey: sessionsQueryKey,
    enabled: false,
    queryFn: async () => {
      await ensureReady();
      const response = await fetch("/api/wallcrawler/sessions");

      if (!response.ok) {
        const message = await safeErrorMessage(response);
        throw new Error(message || "Failed to list sessions");
      }

      const data: ListSessionsResponse = await response.json();
      return data.sessions ?? [];
    },
  });

  const searchJobsMutation = useMutation({
    mutationFn: async (params: {
      keywords: string;
      location: string;
      jobBoard: string;
      saveSearch?: boolean;
      searchName?: string;
    }) => {
      await ensureReady();

      const response = await fetch("/api/wallcrawler/search/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          boards: [params.jobBoard],
        }),
      });

      if (!response.ok) {
        const message = await safeErrorMessage(response);
        throw new Error(message || "Failed to search jobs");
      }

      const data = await response.json();
      return { jobs: data.jobs || [] } as SearchJobsResponse;
    },
  });

  const applyToJobMutation = useMutation({
    mutationFn: async (params: {
      sessionId: string;
      jobUrl: string;
      jobDetails: JobDetails;
      resumeS3Key?: string;
      coverLetter?: string;
    }) => {
      await ensureReady();

      const response = await fetch("/api/wallcrawler/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const message = await safeErrorMessage(response);
        throw new Error(message || "Failed to apply to job");
      }

      const data: ApplyToJobResponse = await response.json();
      return data;
    },
  });

  const resumeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await ensureReady();

      const response = await fetch(`/api/wallcrawler/session?sessionId=${sessionId}`);

      if (!response.ok) {
        const message = await safeErrorMessage(response);
        throw new Error(message || "Failed to resume session");
      }

      const data: ResumeSessionResponse = await response.json();
      return data;
    },
  });

  const listSessions = useCallback(async () => {
    const result = await refetchSessions();
    return result.data ?? cachedSessions ?? [];
  }, [refetchSessions, cachedSessions]);

  const searchJobs = useCallback(
    async (params: {
      keywords: string;
      location: string;
      jobBoard: string;
      saveSearch?: boolean;
      searchName?: string;
    }) => searchJobsMutation.mutateAsync(params),
    [searchJobsMutation]
  );

  const applyToJob = useCallback(
    async (params: {
      sessionId: string;
      jobUrl: string;
      jobDetails: JobDetails;
      resumeS3Key?: string;
      coverLetter?: string;
    }) => applyToJobMutation.mutateAsync(params),
    [applyToJobMutation]
  );

  const resumeSession = useCallback(
    async (sessionId: string) => resumeSessionMutation.mutateAsync(sessionId),
    [resumeSessionMutation]
  );

  const isLoading =
    authLoading ||
    tokenLoading ||
    tokenFetching ||
    sessionsFetching ||
    searchJobsMutation.isPending ||
    applyToJobMutation.isPending ||
    resumeSessionMutation.isPending;

  const latestError =
    tokenError ||
    sessionsError ||
    searchJobsMutation.error ||
    applyToJobMutation.error ||
    resumeSessionMutation.error;

  const error = latestError
    ? latestError instanceof Error
      ? latestError.message
      : String(latestError)
    : null;

  const isInitialized = isAuthenticated
    ? !authLoading
    : !authLoading && (tokenFetched || !!hasAnonymousToken || tokenIsError);

  const anonymousId = !isAuthenticated && hasAnonymousToken ? "anonymous" : null;

  return {
    anonymousId,
    isLoading,
    error,
    resumeSession,
    listSessions,
    searchJobs,
    applyToJob,
    isInitialized,
  };
}
