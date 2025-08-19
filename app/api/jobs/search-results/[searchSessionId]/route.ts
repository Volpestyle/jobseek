import { NextResponse } from "next/server";
import { withAuthOrAnonToken, setRefreshedTokenCookie } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuthOrAnonToken<{ searchSessionId: string }>(
  async (request, { params }, { user, refreshedToken }) => {
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

      // Fetch specific job search result
      const results = await dynamodbService.getSearchResults(
        params.searchSessionId
      );
      const result = results.length > 0 ? results[0] : null;

      if (!result) {
        return setRefreshedTokenCookie(
          NextResponse.json(
            { error: "Job search results not found" },
            { status: 404 }
          ),
          refreshedToken
        );
      }

      return setRefreshedTokenCookie(NextResponse.json({ result }), refreshedToken);
    } catch (error) {
      console.error("Failed to fetch job search result:", error);
      return setRefreshedTokenCookie(
        NextResponse.json(
          { error: "Failed to fetch job search result" },
          { status: 500 }
        ),
        refreshedToken
      );
    }
  }
);
