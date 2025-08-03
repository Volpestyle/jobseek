import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function PUT(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { saved } = body

    if (typeof saved !== 'boolean') {
      return NextResponse.json(
        { error: "Saved boolean value required" },
        { status: 400 }
      )
    }

    await dynamoDBService.saveUserBoardPreference(
      session.user.id, 
      params.boardId, 
      saved
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save user board preference:", error)
    return NextResponse.json(
      { error: "Failed to save board preference" },
      { status: 500 }
    )
  }
}