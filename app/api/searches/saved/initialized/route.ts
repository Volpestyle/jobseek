import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const initialized = await dynamoDBService.hasInitializedSearches(session.user.id)

    return NextResponse.json({ initialized })
  } catch (error) {
    console.error("Failed to check search initialization status:", error)
    return NextResponse.json(
      { error: "Failed to check initialization status" },
      { status: 500 }
    )
  }
}