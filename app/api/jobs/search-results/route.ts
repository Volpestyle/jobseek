import { NextResponse } from "next/server";
import { withAuthOrAnonToken, setRefreshedTokenCookie } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuthOrAnonToken(async (request, context, { user, refreshedToken }) => {
  try {
    if (!user.isAuthenticated) {
      return setRefreshedTokenCookie(
        NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        ),
        refreshedToken
      );
    }

    // Fetch all job search results for the user
    const results = await dynamodbService.getAllJobSearchResults(user.userId);

    return setRefreshedTokenCookie(NextResponse.json({ results }), refreshedToken);
  } catch (error) {
    console.error("Failed to fetch job search results:", error);
    return setRefreshedTokenCookie(
      NextResponse.json(
        { error: "Failed to fetch job search results" },
        { status: 500 }
      ),
      refreshedToken
    );
  }
});
