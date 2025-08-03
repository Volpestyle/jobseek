import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const savedBoardIds = await dynamoDBService.getUserSavedBoards(session.user.id)

    return NextResponse.json({ savedBoardIds })
  } catch (error) {
    console.error("Failed to get user board preferences:", error)
    return NextResponse.json(
      { error: "Failed to get board preferences" },
      { status: 500 }
    )
  }
}