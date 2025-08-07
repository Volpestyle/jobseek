import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth.config'
import { verifyAnonymousToken, validateTokenFingerprint } from '@/lib/auth/anonymous'
import { dynamodbService } from '@/lib/db/dynamodb.service'
import { createWallcrawlerClient } from '@/lib/wallcrawler-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth()
    const { sessionId } = params
    
    // Get anonymous token if no auth session
    const anonymousToken = request.cookies.get('anonymous-token')?.value
    
    let userId: string | null = null
    let isAnonymous = false
    
    if (session?.user?.id) {
      userId = session.user.id
    } else if (anonymousToken) {
      const tokenData = verifyAnonymousToken(anonymousToken)
      if (tokenData && validateTokenFingerprint(anonymousToken, request, false)) {
        userId = tokenData.id
        isAnonymous = true
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Wallcrawler SDK
    const wallcrawler = createWallcrawlerClient()
    
    // Get session details from Wallcrawler
    let wallcrawlerSession
    try {
      wallcrawlerSession = await wallcrawler.sessions.retrieve(sessionId)
      
      // Verify session belongs to user
      const sessionUserId = wallcrawlerSession.userMetadata?.userId
      if (sessionUserId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } catch (error) {
      console.error('Failed to retrieve Wallcrawler session:', error)
      // Session might not exist in Wallcrawler yet
    }
    
    // Get job search results from storage
    let jobSearchResults = null
    if (!isAnonymous) {
      jobSearchResults = await dynamodbService.getJobSearchResults(userId, sessionId)
    }
    // For anonymous users, results would be fetched client-side from localStorage
    
    // Mock action logs for now (in production, these would come from a real logging service)
    const actionLogs = generateMockActionLogs(sessionId, wallcrawlerSession?.status)
    
    return NextResponse.json({
      session: wallcrawlerSession ? {
        id: wallcrawlerSession.id,
        status: wallcrawlerSession.status,
        createdAt: wallcrawlerSession.createdAt,
        updatedAt: wallcrawlerSession.updatedAt,
        startedAt: wallcrawlerSession.startedAt,
        endedAt: wallcrawlerSession.endedAt,
        region: wallcrawlerSession.region,
        userMetadata: wallcrawlerSession.userMetadata,
        connectUrl: wallcrawlerSession.connectUrl
      } : null,
      jobs: jobSearchResults?.jobs || [],
      totalJobs: jobSearchResults?.totalJobsFound || 0,
      actionLogs,
      searchParams: jobSearchResults?.searchParams || wallcrawlerSession?.userMetadata
    })
  } catch (error) {
    console.error('Failed to get session details:', error)
    return NextResponse.json(
      { error: 'Failed to get session details' },
      { status: 500 }
    )
  }
}

// Generate mock action logs for demonstration
function generateMockActionLogs(sessionId: string, status?: string) {
  const baseTime = new Date()
  const logs = [
    {
      id: `${sessionId}_log_1`,
      timestamp: new Date(baseTime.getTime() - 60000).toISOString(),
      action: 'Navigating to job board',
      type: 'navigate' as const,
      details: 'Opening Indeed.com',
      status: 'success' as const
    },
    {
      id: `${sessionId}_log_2`,
      timestamp: new Date(baseTime.getTime() - 55000).toISOString(),
      action: 'Searching for jobs',
      type: 'act' as const,
      details: 'Entering search keywords and location',
      status: 'success' as const
    },
    {
      id: `${sessionId}_log_3`,
      timestamp: new Date(baseTime.getTime() - 50000).toISOString(),
      action: 'Waiting for results',
      type: 'observe' as const,
      details: 'Page loading job listings',
      status: 'success' as const
    },
    {
      id: `${sessionId}_log_4`,
      timestamp: new Date(baseTime.getTime() - 45000).toISOString(),
      action: 'Extracting job data',
      type: 'extract' as const,
      details: 'Found 25 job listings on page 1',
      status: 'success' as const
    }
  ]
  
  if (status === 'RUNNING') {
    logs.push({
      id: `${sessionId}_log_5`,
      timestamp: new Date().toISOString(),
      action: 'Scrolling for more results',
      type: 'scroll' as const,
      details: 'Loading additional job listings',
      status: 'pending' as const
    })
  }
  
  return logs
}