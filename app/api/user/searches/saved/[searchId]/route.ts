import { NextResponse } from "next/server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { withAuth } from "@/lib/auth/api-wrappers";

export const GET = withAuth<{ searchId: string }>(
  async (request, { params }, { user }) => {
    try {
      const search = await dynamodbService.getSavedSearch(
        user.id,
        params.searchId
      );

      if (!search) {
        return NextResponse.json(
          { error: "Search not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ search });
    } catch (error) {
      console.error("Failed to get saved search:", error);
      return NextResponse.json(
        { error: "Failed to get saved search" },
        { status: 500 }
      );
    }
  }
);

export const PUT = withAuth<{ searchId: string }>(
  async (request, { params }, { user }) => {
    try {
      const body = await request.json();
      const {
        name,
        keywords,
        location,
        jobBoards,
        filters,
        runFrequency,
        isActive,
        isEditable,
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

      // Get existing search to preserve readonly fields
      const existingSearch = await dynamodbService.getSavedSearch(
        user.id,
        params.searchId
      );

      if (!existingSearch) {
        return NextResponse.json(
          { error: "Search not found" },
          { status: 404 }
        );
      }

      // Check if search is editable
      if (existingSearch.isEditable === false) {
        return NextResponse.json(
          { error: "This search cannot be edited" },
          { status: 403 }
        );
      }

      const updatedSearch = await dynamodbService.updateSavedSearch({
        ...existingSearch,
        name,
        keywords,
        location,
        jobBoards,
        filters,
        skills,
        workPreferences,
        runFrequency,
        isActive: isActive !== undefined ? isActive : existingSearch.isActive,
        isEditable:
          isEditable !== undefined ? isEditable : existingSearch.isEditable,
      });

      return NextResponse.json({ search: updatedSearch });
    } catch (error) {
      console.error("Failed to update saved search:", error);
      return NextResponse.json(
        { error: "Failed to update saved search" },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth<{ searchId: string }>(
  async (request, { params }, { user }) => {
    try {
      await dynamodbService.deleteSavedSearch(user.id, params.searchId);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to delete saved search:", error);
      return NextResponse.json(
        { error: "Failed to delete saved search" },
        { status: 500 }
      );
    }
  }
);
