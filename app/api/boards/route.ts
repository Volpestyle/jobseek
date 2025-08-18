import { NextResponse } from "next/server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { withAuth } from "@/lib/auth/api-wrappers";

export const GET = withAuth(async (request, context, { user }) => {
  try {
    const boards = await dynamodbService.getJobBoards(user.id);

    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Failed to get job boards:", error);
    return NextResponse.json(
      { error: "Failed to get job boards" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context, { user }) => {
  try {
    const body = await request.json();
    const { name, description, isPublic } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Board name required" },
        { status: 400 }
      );
    }

    const board = await dynamodbService.createJobBoard({
      userId: user.id,
      boardId: `board_${Date.now()}`,
      name,
      description,
      jobIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: isPublic || false,
    });

    return NextResponse.json({ board });
  } catch (error) {
    console.error("Failed to create job board:", error);
    return NextResponse.json(
      { error: "Failed to create job board" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, { user }) => {
  try {
    const body = await request.json();
    const { boardId, action, jobId } = body;

    if (!boardId || !action) {
      return NextResponse.json(
        { error: "Board ID and action required" },
        { status: 400 }
      );
    }

    if (action === "addJob" && jobId) {
      await dynamodbService.addJobToBoard(user.id, boardId, jobId);
    } else if (action === "removeJob" && jobId) {
      await dynamodbService.removeJobFromBoard(user.id, boardId, jobId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update job board:", error);
    return NextResponse.json(
      { error: "Failed to update job board" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json({ error: "Board ID required" }, { status: 400 });
    }

    await dynamodbService.deleteJobBoard(user.id, boardId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job board:", error);
    return NextResponse.json(
      { error: "Failed to delete job board" },
      { status: 500 }
    );
  }
});
