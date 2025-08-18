import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const PUT = withAuth<{ boardId: string }>(
  async (request, { params }, { user }) => {
    try {
      const body = await request.json();
      const { saved } = body;

      if (typeof saved !== "boolean") {
        return NextResponse.json(
          { error: "Saved boolean value required" },
          { status: 400 }
        );
      }

      await dynamodbService.saveUserBoardPreference(
        user.id,
        params.boardId,
        saved
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to save user board preference:", error);
      return NextResponse.json(
        { error: "Failed to save board preference" },
        { status: 500 }
      );
    }
  }
);
