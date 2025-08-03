import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dynamoDBService.markSearchesInitialized(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to mark searches as initialized:", error)
    return NextResponse.json(
      { error: "Failed to mark searches as initialized" },
      { status: 500 }
    )
  }
}