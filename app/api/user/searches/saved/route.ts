import { NextRequest, NextResponse } from "next/server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";

export const GET = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    if (!user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedSearches = await dynamodbService.getSavedSearches(user.userId);

    return NextResponse.json({ searches: savedSearches });
  } catch (error) {
    console.error("Failed to get saved searches:", error);
    return NextResponse.json(
      { error: "Failed to get saved searches" },
      { status: 500 }
    );
  }
});

export const POST = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    if (!user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      keywords,
      location,
      jobBoards,
      filters,
      runFrequency,
      skills,
      workPreferences,
    } = body;

    if (
      !name ||
      !keywords ||
      !location ||
      !jobBoards ||
      jobBoards.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const savedSearch = await dynamodbService.saveSearch({
      userId: user.userId,
      searchId: `search_${Date.now()}`,
      name,
      keywords,
      location,
      jobBoards,
      filters,
      skills,
      workPreferences,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      runFrequency,
    });

    return NextResponse.json({ search: savedSearch });
  } catch (error) {
    console.error("Failed to save search:", error);
    return NextResponse.json(
      { error: "Failed to save search" },
      { status: 500 }
    );
  }
});
