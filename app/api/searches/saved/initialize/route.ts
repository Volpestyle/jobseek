import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { searches } = body

    if (!searches || !Array.isArray(searches)) {
      return NextResponse.json(
        { error: "Searches array required" },
        { status: 400 }
      )
    }

    await dynamoDBService.initializeDefaultSearches(session.user.id, searches)
    await dynamoDBService.markSearchesInitialized(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to initialize default searches:", error)
    return NextResponse.json(
      { error: "Failed to initialize default searches" },
      { status: 500 }
    )
  }
}