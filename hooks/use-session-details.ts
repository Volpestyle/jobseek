'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface SessionDetails {
  id: string
  status: 'RUNNING' | 'COMPLETED' | 'ERROR' | 'TIMED_OUT'
  createdAt: string
  updatedAt: string
  startedAt: string
  endedAt?: string
  region: string
  userMetadata?: Record<string, unknown>
  connectUrl?: string
}

interface JobResult {
  jobId: string
  title: string
  company: string
  location: string
  salary?: string
  url: string
  description: string
  source: string
  postedDate?: string
}

interface ActionLog {
  id: string
  timestamp: string
  action: string
  type: 'act' | 'extract' | 'observe' | 'navigate' | 'scroll' | 'error' | 'info'
  details?: string
  status?: 'pending' | 'success' | 'error'
}

export function useSessionDetails(sessionId: string) {
  const { data: authSession } = useSession()
  const [session, setSession] = useState<SessionDetails | null>(null)
  const [jobs, setJobs] = useState<JobResult[]>([])
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalJobs, setTotalJobs] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Fetch session details
  const fetchSessionDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/wallcrawler/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session details')
      }
      
      const data = await response.json()
      setSession(data.session)
      setJobs(data.jobs || [])
      setTotalJobs(data.totalJobs || 0)
      setActionLogs(data.actionLogs || [])
      
      // If session is still running, continue polling
      if (data.session.status === 'RUNNING') {
        setTimeout(fetchSessionDetails, 5000) // Poll every 5 seconds
      }
    } catch (err) {
      console.error('Error fetching session details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Fetch action logs
  const fetchActionLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/wallcrawler/sessions/${sessionId}/actions`)
      if (!response.ok) {
        return
      }
      
      const data = await response.json()
      setActionLogs(data.logs || [])
      
      // Continue polling if session is running
      if (session?.status === 'RUNNING') {
        setTimeout(fetchActionLogs, 2000) // Poll every 2 seconds for logs
      }
    } catch (err) {
      console.error('Error fetching action logs:', err)
    }
  }, [sessionId, session?.status])

  // Initial load
  useEffect(() => {
    fetchSessionDetails()
  }, [fetchSessionDetails])

  // Poll for action logs if session is running
  useEffect(() => {
    if (session?.status === 'RUNNING') {
      const interval = setInterval(fetchActionLogs, 2000)
      return () => clearInterval(interval)
    }
  }, [session?.status, fetchActionLogs])

  // Paginate jobs
  const paginatedJobs = jobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const refreshSession = () => {
    setIsLoading(true)
    fetchSessionDetails()
  }

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
    pageSize
  }
}