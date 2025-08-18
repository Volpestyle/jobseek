import { NextResponse } from "next/server";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuthOrAnonToken<{ searchSessionId: string }>(
  async (request, { params }, { user }) => {
    try {
      if (!user.isAuthenticated) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Fetch specific job search result
      const result = await dynamodbService.getJobSearchResults(
        user.userId,
        params.searchSessionId
      );

      if (!result) {
        return NextResponse.json(
          { error: "Job search results not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ result });
    } catch (error) {
      console.error("Failed to fetch job search result:", error);
      return NextResponse.json(
        { error: "Failed to fetch job search result" },
        { status: 500 }
      );
    }
  }
);
