'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { JobSearchResult, ExtractedJob } from '@/lib/db/dynamodb.service'

export interface StreamedJobResult {
  title: string
  company: string
  location: string
  salary?: string
  url: string
  description: string
}

export interface SearchStreamState {
  isSearching: boolean
  sessionId: string | null
  debugUrl?: string
  jobs: StreamedJobResult[]
  status: 'idle' | 'searching' | 'completed' | 'error'
  statusMessage?: string
  error?: string
  totalJobsFound: number
}

export function useJobSearchStream() {
  const { storage, userId, isAnonymous } = useAuth()
  const [state, setState] = useState<SearchStreamState>({
    isSearching: false,
    sessionId: null,
    jobs: [],
    status: 'idle',
    totalJobsFound: 0
  })
  const abortControllerRef = useRef<AbortController | null>(null)

  const startSearch = useCallback(async (
    keywords: string,
    location: string,
    jobBoard: string
  ) => {
    // Reset state
    setState({
      isSearching: true,
      sessionId: null,
      jobs: [],
      status: 'searching',
      totalJobsFound: 0
    })

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      // Start SSE connection
      const response = await fetch('/api/wallcrawler/search/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords, location, jobBoard }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to start search')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Process the stream
      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              
              switch (event.type) {
                case 'session_started':
                  setState(prev => ({
                    ...prev,
                    sessionId: event.sessionId,
                    debugUrl: event.debugUrl,
                    statusMessage: 'Search started...'
                  }))
                  break

                case 'job_found':
                  const newJob = event.job
                  setState(prev => ({
                    ...prev,
                    jobs: [...prev.jobs, newJob],
                    totalJobsFound: prev.totalJobsFound + 1
                  }))

                  // For anonymous users, save to localStorage immediately
                  if (isAnonymous && storage && state.sessionId) {
                    const jobResult: JobSearchResult = {
                      userId: userId || 'anonymous',
                      searchSessionId: state.sessionId,
                      jobs: [...state.jobs, {
                        jobId: `${state.sessionId}_${event.index}_${Date.now()}`,
                        ...newJob
                      }] as ExtractedJob[],
                      searchParams: { keywords, location, jobBoard },
                      status: 'running',
                      totalJobsFound: state.totalJobsFound + 1,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    }
                    
                    // Save or update in localStorage
                    if (state.jobs.length === 0) {
                      await storage.saveJobSearchResults(jobResult)
                    } else {
                      await storage.updateJobSearchResults(state.sessionId, {
                        jobs: jobResult.jobs,
                        totalJobsFound: jobResult.totalJobsFound,
                        updatedAt: jobResult.updatedAt
                      })
                    }
                  }
                  break

                case 'status_update':
                  setState(prev => ({
                    ...prev,
                    statusMessage: event.message
                  }))
                  break

                case 'complete':
                  setState(prev => ({
                    ...prev,
                    status: 'completed',
                    isSearching: false,
                    statusMessage: `Found ${event.totalJobs} jobs`
                  }))

                  // For anonymous users, mark as completed in localStorage
                  if (isAnonymous && storage && event.sessionId) {
                    await storage.updateJobSearchResults(event.sessionId, {
                      status: 'completed',
                      updatedAt: new Date().toISOString()
                    })
                  }
                  break

                case 'error':
                  setState(prev => ({
                    ...prev,
                    status: 'error',
                    isSearching: false,
                    error: event.error
                  }))
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Search stream error:', error)
      setState(prev => ({
        ...prev,
        status: 'error',
        isSearching: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }))
    }
  }, [storage, userId, isAnonymous, state.sessionId, state.jobs])

  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(prev => ({
      ...prev,
      isSearching: false,
      status: 'idle'
    }))
  }, [])

  return {
    ...state,
    startSearch,
    cancelSearch
  }
}