import { NextResponse } from "next/server";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    if (!user.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch all job search results for the user
    const results = await dynamodbService.getAllJobSearchResults(user.userId);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to fetch job search results:", error);
    return NextResponse.json(
      { error: "Failed to fetch job search results" },
      { status: 500 }
    );
  }
});
