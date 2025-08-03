import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'

// API Response Types
interface SessionDetails {
  id: string
  status: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
  region: string
  keywords: string
  location: string
  jobBoard: string
}

interface ListSessionsResponse {
  sessions: SessionDetails[]
}

interface ResumeSessionResponse {
  sessionId: string
  status: string
  createdAt: string
  expiresAt: string
  debugUrl?: string
  debuggerFullscreenUrl?: string
  connectUrl?: string
  userMetadata?: Record<string, unknown>
}

interface SearchJobsResponse {
  jobs: JobResult[]
}

interface JobResult {
  id: string
  title: string
  company: string
  location: string
  url: string
  description?: string
  salary?: string
  postedDate?: string
  source: string
}

interface JobDetails {
  title: string
  company: string
  location: string
  description?: string
  requirements?: string[]
  benefits?: string[]
  salary?: string
  type?: 'full-time' | 'part-time' | 'contract' | 'internship'
  remote?: boolean
}

interface ApplyToJobResponse {
  success: true
  message: string
  applicationId?: string
}

interface UseAnonymousSessionReturn {
  anonymousId: string | null
  isLoading: boolean
  error: string | null
  resumeSession: (sessionId: string) => Promise<ResumeSessionResponse>
  listSessions: () => Promise<SessionDetails[]>
  searchJobs: (params: {
    keywords: string
    location: string
    jobBoard: string
    saveSearch?: boolean
    searchName?: string
  }) => Promise<SearchJobsResponse>
  applyToJob: (params: {
    sessionId: string
    jobUrl: string
    jobDetails: JobDetails
    resumeS3Key?: string
    coverLetter?: string
  }) => Promise<ApplyToJobResponse>
}

// Check if we have a valid anonymous token cookie
async function ensureAnonymousToken(): Promise<boolean> {
  try {
    // The cookie is httpOnly, so we can't read it directly
    // We'll make a request to get/refresh the token
    const response = await fetch('/api/auth/anonymous');
    if (!response.ok) {
      console.error('Failed to get anonymous token');
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error getting anonymous token:', error);
    return false;
  }
}

export function useAnonymousSession(): UseAnonymousSessionReturn {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAnonymousToken, setHasAnonymousToken] = useState<boolean>(false)

  // Ensure anonymous token on mount for anonymous users
  useEffect(() => {
    if (!session?.user) {
      ensureAnonymousToken().then(success => {
        setHasAnonymousToken(success);
      });
    } else {
      setHasAnonymousToken(false);
    }
  }, [session])

  const listSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (session?.user) {
        // Authenticated user - use GET
        const response = await fetch('/api/wallcrawler/sessions')
        
        if (!response.ok) {
          throw new Error('Failed to list sessions')
        }

        const data: ListSessionsResponse = await response.json()
        return data.sessions
      } else {
        // Anonymous user - use POST with anonymousId
        const response = await fetch('/api/wallcrawler/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // Token is in cookie
        })

        if (!response.ok) {
          throw new Error('Failed to list sessions')
        }

        const data: ListSessionsResponse = await response.json()
        return data.sessions
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list sessions'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const searchJobs = useCallback(async (params: {
    keywords: string
    location: string
    jobBoard: string
    saveSearch?: boolean
    searchName?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      // Start a new search
      const response = await fetch('/api/wallcrawler/search/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          boards: [params.jobBoard],
          // Anonymous token is in httpOnly cookie
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to search jobs')
      }

      const data = await response.json()
      return { jobs: data.jobs || [] }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search jobs'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const applyToJob = useCallback(async (params: {
    sessionId: string
    jobUrl: string
    jobDetails: JobDetails
    resumeS3Key?: string
    coverLetter?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/wallcrawler/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          // Anonymous token is in httpOnly cookie
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to apply to job')
      }

      const data: ApplyToJobResponse = await response.json()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply to job'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const resumeSession = useCallback(async (sessionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/wallcrawler/session?sessionId=${sessionId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resume session')
      }

      const data: ResumeSessionResponse = await response.json()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume session'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    anonymousId: hasAnonymousToken ? 'anonymous' : null, // Just indicate if we have a token
    isLoading,
    error,
    resumeSession,
    listSessions,
    searchJobs,
    applyToJob,
  }
}