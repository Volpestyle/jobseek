import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth-utils'
import { createWallcrawlerClient } from '@/lib/wallcrawler-client'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Initialize Wallcrawler SDK
    const wallcrawler = createWallcrawlerClient()

    // Build query as JSON object for user metadata filtering
    const query = JSON.stringify({ userId: user.userId })

    // List sessions filtered by user metadata
    let sessions
    try {
      sessions = await wallcrawler.sessions.list({
        q: query,
        status: 'RUNNING', // Only get active sessions
      })
      console.log('Successfully listed sessions:', sessions.length)
    } catch (error: any) {
      console.error('Failed to list sessions:', {
        status: error.status,
        message: error.message,
        error: error.error,
        headers: error.headers,
      })
      throw error
    }

    // Format sessions for frontend
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      region: session.region,
      keywords: session.userMetadata?.keywords || '',
      location: session.userMetadata?.location || '',
      jobBoard: session.userMetadata?.jobBoard || '',
    }))

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('Sessions POST - User:', { userId: user.userId, isAnonymous: user.isAnonymous })

    // Initialize Wallcrawler SDK
    const wallcrawler = createWallcrawlerClient()

    // Build query as JSON object for user metadata filtering  
    const query = JSON.stringify({ userId: user.userId })

    console.log('Listing sessions for user:', { userId: user.userId, query })

    // List sessions filtered by user metadata
    let sessions;
    try {
      sessions = await wallcrawler.sessions.list({
        q: query,
        status: 'RUNNING',
      })
      console.log('Successfully listed sessions:', sessions.length)
    } catch (error: any) {
      console.error('Failed to list sessions in POST:', {
        status: error.status,
        message: error.message,
        error: error.error,
        headers: error.headers,
      })
      throw error
    }

    // Format sessions for frontend
    const formattedSessions = sessions?.map(session => ({
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      region: session.region,
      keywords: session.userMetadata?.keywords || '',
      location: session.userMetadata?.location || '',
      jobBoard: session.userMetadata?.jobBoard || '',
    }))

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error('Failed to fetch anonymous sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}