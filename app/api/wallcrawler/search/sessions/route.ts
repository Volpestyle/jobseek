import { NextResponse } from "next/server";
import { withAuthOrAnonToken, setRefreshedTokenCookie } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

export const GET = withAuthOrAnonToken(async (request, context, { user, refreshedToken }) => {
  try {
    // Fetch all master search sessions for the user
    // This works for both authenticated users (using their real userId)
    // and anonymous users (using their anon_${id} userId)
    const sessions = await dynamodbService.getMasterSearchesByUserId(user.userId);
    
    // Sort by creation date, most recent first
    sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return setRefreshedTokenCookie(
      NextResponse.json({ 
        sessions,
        userId: user.userId,
        isAnonymous: user.isAnonymous 
      }), 
      refreshedToken
    );
  } catch (error) {
    console.error("Failed to fetch master search sessions:", error);
    return setRefreshedTokenCookie(
      NextResponse.json(
        { error: "Failed to fetch search sessions" },
        { status: 500 }
      ),
      refreshedToken
    );
  }
});