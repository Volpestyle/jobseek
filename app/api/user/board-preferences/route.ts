import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuth(async (request, context, { user }) => {
  try {
    const savedBoardIds = await dynamodbService.getUserSavedBoards(user.id);

    return NextResponse.json({ savedBoardIds });
  } catch (error) {
    console.error("Failed to get user board preferences:", error);
    return NextResponse.json(
      { error: "Failed to get board preferences" },
      { status: 500 }
    );
  }
});
