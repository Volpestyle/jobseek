import { NextResponse } from "next/server";
import { withAuthOrAnonToken, setRefreshedTokenCookie } from "@/lib/auth/api-wrappers";
import { wallcrawlerService } from "@/lib/wallcrawler.server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import type { MasterSearchSession } from "@/lib/db/dynamodb.service";

export const POST = withAuthOrAnonToken(async (request, context, { user, refreshedToken }) => {
  try {
    const body = await request.json();
    const { keywords, location, boards, saveSearch, searchName } = body;

    if (!keywords || !boards || boards.length === 0) {
      const response = NextResponse.json(
        { error: "Missing required fields: keywords and boards are required" },
        { status: 400 }
      );
      return setRefreshedTokenCookie(response, refreshedToken);
    }

    // Create master search session
    const masterSearchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract anonymous ID from userId if it's an anonymous user
    const anonymousId = user.isAnonymous ? user.userId.replace('anon_', '') : undefined;
    
    const masterSearch: MasterSearchSession = {
      userId: user.userId,
      searchId: masterSearchId,
      anonymousId: anonymousId,
      searchParams: { keywords, location: location || "", boards },
      boardSessions: {},
      totalJobsFound: 0,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: user.isAnonymous ? Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) : undefined
    };
    
    // Initialize board sessions
    for (const board of boards) {
      masterSearch.boardSessions[board] = {
        sessionId: '',  // Will be filled when Wallcrawler starts
        status: 'pending',
        jobCount: 0
      };
    }
    
    // Save master search
    await dynamodbService.createMasterSearch(masterSearch);

    // Save the search if requested (authenticated users only)
    if (user.isAuthenticated && saveSearch && searchName) {
      await dynamodbService.saveSearch({
        userId: user.userId,
        searchId: `saved_${Date.now()}`,
        name: searchName,
        keywords,
        location: location || "",
        jobBoards: boards,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
    } else if (!user.isAuthenticated && saveSearch) {
      const response = NextResponse.json(
        {
          error: "Anonymous users cannot save searches. Please sign in to save searches.",
        },
        { status: 403 }
      );
      return setRefreshedTokenCookie(response, refreshedToken);
    }
    
    // Start parallel searches for each board
    const boardPromises = boards.map(async (board: string) => {
      try {
        const result = await wallcrawlerService.runJobSearchAsync({
          keywords,
          location: location || "",
          jobBoard: board,
          userMetadata: {
            userId: user.userId,
            anonymousId: anonymousId,
            isAnonymous: user.isAnonymous,
            masterSearchId,
            boardName: board
          }
        });
        
        // Update master search with Wallcrawler session ID
        await dynamodbService.updateBoardSessionStatus(
          user.userId,
          masterSearchId,
          board,
          'running',
          0
        );
        
        return { board, ...result };
      } catch (error) {
        console.error(`Failed to search ${board}:`, error);
        await dynamodbService.updateBoardSessionStatus(
          user.userId,
          masterSearchId,
          board,
          'error',
          0,
          error instanceof Error ? error.message : 'Unknown error'
        );
        return { board, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    // Don't wait for all to complete - return immediately
    Promise.all(boardPromises).then(async (results) => {
      // Update master search status when all complete
      const successCount = results.filter(r => !r.error).length;
      const status = successCount === 0 ? 'error' : 
                     successCount === boards.length ? 'completed' : 'partial';
      
      await dynamodbService.updateMasterSearchStatus(
        user.userId,
        masterSearchId,
        status
      );
    }).catch(console.error);
    
    // Return immediately with master search info
    const response = NextResponse.json({
      searchId: masterSearchId,
      message: `Starting search on ${boards.length} job board${boards.length > 1 ? 's' : ''}`,
      boards: masterSearch.boardSessions
    });
    return setRefreshedTokenCookie(response, refreshedToken);
  } catch (error) {
    console.error("Failed to start job search:", error);
    const response = NextResponse.json(
      { error: "Failed to start job search" },
      { status: 500 }
    );
    return setRefreshedTokenCookie(response, refreshedToken);
  }
});
