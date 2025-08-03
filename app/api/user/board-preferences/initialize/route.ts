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
    const { boardIds } = body

    if (!boardIds || !Array.isArray(boardIds)) {
      return NextResponse.json(
        { error: "Board IDs array required" },
        { status: 400 }
      )
    }

    await dynamoDBService.initializeUserJobBoards(session.user.id, boardIds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to initialize user board preferences:", error)
    return NextResponse.json(
      { error: "Failed to initialize board preferences" },
      { status: 500 }
    )
  }
}