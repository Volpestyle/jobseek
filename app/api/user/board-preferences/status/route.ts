import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuth(async (request, context, { user }) => {
  try {
    const initialized = await dynamodbService.isUserInitialized(user.id);

    return NextResponse.json({ initialized });
  } catch (error) {
    console.error("Failed to get user initialization status:", error);
    return NextResponse.json(
      { error: "Failed to get initialization status" },
      { status: 500 }
    );
  }
});
