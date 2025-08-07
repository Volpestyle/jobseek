import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth-utils'
import { dynamodbService } from '@/lib/db/dynamodb.service'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch all job search results for the user
    const results = await dynamodbService.getAllJobSearchResults(user.userId)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Failed to fetch job search results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job search results' },
      { status: 500 }
    )
  }
}