import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const POST = withAuth(async (request, context, { user }) => {
  try {
    const body = await request.json();
    const { boardIds } = body;

    if (!boardIds || !Array.isArray(boardIds)) {
      return NextResponse.json(
        { error: "Board IDs array required" },
        { status: 400 }
      );
    }

    await dynamodbService.initializeUserJobBoards(user.id, boardIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to initialize user board preferences:", error);
    return NextResponse.json(
      { error: "Failed to initialize board preferences" },
      { status: 500 }
    );
  }
});
