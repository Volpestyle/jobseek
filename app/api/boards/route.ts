import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth.config"
import { dynamoDBService } from "@/lib/db/dynamodb.service"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const boards = await dynamoDBService.getJobBoards(session.user.id)

    return NextResponse.json({ boards })
  } catch (error) {
    console.error("Failed to get job boards:", error)
    return NextResponse.json(
      { error: "Failed to get job boards" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, isPublic } = body

    if (!name) {
      return NextResponse.json(
        { error: "Board name required" },
        { status: 400 }
      )
    }

    const board = await dynamoDBService.createJobBoard({
      userId: session.user.id,
      boardId: `board_${Date.now()}`,
      name,
      description,
      jobs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: isPublic || false,
    })

    return NextResponse.json({ board })
  } catch (error) {
    console.error("Failed to create job board:", error)
    return NextResponse.json(
      { error: "Failed to create job board" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { boardId, action, jobId } = body

    if (!boardId || !action) {
      return NextResponse.json(
        { error: "Board ID and action required" },
        { status: 400 }
      )
    }

    if (action === "addJob" && jobId) {
      await dynamoDBService.addJobToBoard(session.user.id, boardId, jobId)
    } else if (action === "removeJob" && jobId) {
      await dynamoDBService.removeJobFromBoard(session.user.id, boardId, jobId)
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update job board:", error)
    return NextResponse.json(
      { error: "Failed to update job board" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get("boardId")

    if (!boardId) {
      return NextResponse.json(
        { error: "Board ID required" },
        { status: 400 }
      )
    }

    await dynamoDBService.deleteJobBoard(session.user.id, boardId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete job board:", error)
    return NextResponse.json(
      { error: "Failed to delete job board" },
      { status: 500 }
    )
  }
}