import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth-utils'
import { dynamodbService } from '@/lib/db/dynamodb.service'

export async function GET(
  request: NextRequest,
  { params }: { params: { searchSessionId: string } }
) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch specific job search result
    const result = await dynamodbService.getJobSearchResults(
      user.userId,
      params.searchSessionId
    )

    if (!result) {
      return NextResponse.json(
        { error: 'Job search results not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Failed to fetch job search result:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job search result' },
      { status: 500 }
    )
  }
}