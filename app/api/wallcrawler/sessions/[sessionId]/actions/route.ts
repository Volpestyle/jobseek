import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth.config'
import { verifyAnonymousToken, validateTokenFingerprint } from '@/lib/auth/anonymous'

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
    
    if (session?.user?.id) {
      userId = session.user.id
    } else if (anonymousToken) {
      const tokenData = verifyAnonymousToken(anonymousToken)
      if (tokenData && validateTokenFingerprint(anonymousToken, request, false)) {
        userId = tokenData.id
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In production, these would come from a real-time logging service
    // For now, return mock action logs that simulate Stagehand actions
    const logs = generateDetailedActionLogs(sessionId)
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Failed to get action logs:', error)
    return NextResponse.json(
      { error: 'Failed to get action logs' },
      { status: 500 }
    )
  }
}

function generateDetailedActionLogs(sessionId: string) {
  const baseTime = new Date()
  
  return [
    {
      id: `${sessionId}_action_1`,
      timestamp: new Date(baseTime.getTime() - 120000).toISOString(),
      action: 'Session initialized',
      type: 'info' as const,
      details: 'Starting job search automation',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_2`,
      timestamp: new Date(baseTime.getTime() - 115000).toISOString(),
      action: 'Browser launched',
      type: 'info' as const,
      details: 'Chrome browser instance created',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_3`,
      timestamp: new Date(baseTime.getTime() - 110000).toISOString(),
      action: 'Navigating to Indeed.com',
      type: 'navigate' as const,
      details: 'Loading https://www.indeed.com',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_4`,
      timestamp: new Date(baseTime.getTime() - 105000).toISOString(),
      action: 'Page loaded',
      type: 'observe' as const,
      details: 'Indeed homepage ready',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_5`,
      timestamp: new Date(baseTime.getTime() - 100000).toISOString(),
      action: 'Finding search fields',
      type: 'observe' as const,
      details: 'Located job title and location inputs',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_6`,
      timestamp: new Date(baseTime.getTime() - 95000).toISOString(),
      action: 'Entering search keywords',
      type: 'act' as const,
      details: 'Typing "Software Engineer" in job field',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_7`,
      timestamp: new Date(baseTime.getTime() - 90000).toISOString(),
      action: 'Entering location',
      type: 'act' as const,
      details: 'Typing "San Francisco, CA" in location field',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_8`,
      timestamp: new Date(baseTime.getTime() - 85000).toISOString(),
      action: 'Submitting search',
      type: 'act' as const,
      details: 'Clicking search button',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_9`,
      timestamp: new Date(baseTime.getTime() - 80000).toISOString(),
      action: 'Waiting for results',
      type: 'observe' as const,
      details: 'Search results loading...',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_10`,
      timestamp: new Date(baseTime.getTime() - 75000).toISOString(),
      action: 'Results loaded',
      type: 'observe' as const,
      details: 'Found job listings on page',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_11`,
      timestamp: new Date(baseTime.getTime() - 70000).toISOString(),
      action: 'Extracting job data (batch 1)',
      type: 'extract' as const,
      details: 'Processing first 10 job listings',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_12`,
      timestamp: new Date(baseTime.getTime() - 65000).toISOString(),
      action: 'Scrolling page',
      type: 'scroll' as const,
      details: 'Loading more results',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_13`,
      timestamp: new Date(baseTime.getTime() - 60000).toISOString(),
      action: 'Extracting job data (batch 2)',
      type: 'extract' as const,
      details: 'Processing next 10 job listings',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_14`,
      timestamp: new Date(baseTime.getTime() - 55000).toISOString(),
      action: 'Scrolling page',
      type: 'scroll' as const,
      details: 'Loading more results',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_15`,
      timestamp: new Date(baseTime.getTime() - 50000).toISOString(),
      action: 'Extracting job data (batch 3)',
      type: 'extract' as const,
      details: 'Processing next 5 job listings',
      status: 'success' as const
    },
    {
      id: `${sessionId}_action_16`,
      timestamp: new Date(baseTime.getTime() - 45000).toISOString(),
      action: 'Extraction complete',
      type: 'info' as const,
      details: 'Total 25 jobs extracted',
      status: 'success' as const
    }
  ]
}