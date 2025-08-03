import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const initialized = await dynamoDBService.isUserInitialized(session.user.id)

    return NextResponse.json({ initialized })
  } catch (error) {
    console.error("Failed to get user initialization status:", error)
    return NextResponse.json(
      { error: "Failed to get initialization status" },
      { status: 500 }
    )
  }
}