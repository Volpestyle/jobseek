import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { MigrationData } from "@/lib/migration/migration.service";

interface MigrationRequest {
  userId: string;
  data: MigrationData;
  version: string;
}

interface MigrationResult {
  savedJobs: number;
  savedSearches: number;
  applications: number;
  jobBoards: number;
  searchResults: number;
  profile: boolean;
}

export const POST = withAuth(async (request, context, { user }) => {
  try {
    const body: MigrationRequest = await request.json();
    
    if (!body.data) {
      return NextResponse.json({
        success: false,
        error: 'Invalid migration request',
        message: 'Migration data is required'
      }, { status: 400 });
    }
    
    const { data } = body;
    
    const migrationResult: MigrationResult = {
      savedJobs: 0,
      savedSearches: 0,
      applications: 0,
      jobBoards: 0,
      searchResults: 0,
      profile: false
    };
    
    const errors: string[] = [];
    
    // Migrate saved jobs
    if (data.savedJobs && data.savedJobs.length > 0) {
      const jobPromises = data.savedJobs.map(async (job) => {
        try {
          await dynamodbService.saveJob({
            ...job,
            userId: user.id,
            savedAt: job.savedAt || new Date().toISOString()
          });
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Job ${job.jobId}: ${errorMessage}`);
          return false;
        }
      });
      
      const results = await Promise.allSettled(jobPromises);
      migrationResult.savedJobs = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
    }
    
    // Migrate saved searches
    if (data.savedSearches && data.savedSearches.length > 0) {
      const searchPromises = data.savedSearches.map(async (search) => {
        try {
          await dynamodbService.saveSearch({
            ...search,
            userId: user.id,
            searchId: search.searchId || `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: search.createdAt || new Date().toISOString(),
            updatedAt: search.updatedAt || new Date().toISOString()
          });
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Search ${search.searchId}: ${errorMessage}`);
          return false;
        }
      });
      
      const results = await Promise.allSettled(searchPromises);
      migrationResult.savedSearches = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
    }
    
    // Migrate applications
    if (data.applications && data.applications.length > 0) {
      const appPromises = data.applications.map(async (app) => {
        try {
          await dynamodbService.saveApplication({
            ...app,
            userId: user.id,
            applicationId: app.applicationId || `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            appliedAt: app.appliedAt || new Date().toISOString()
          });
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Application ${app.applicationId}: ${errorMessage}`);
          return false;
        }
      });
      
      const results = await Promise.allSettled(appPromises);
      migrationResult.applications = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
    }
    
    // Migrate job boards
    if (data.jobBoards && data.jobBoards.length > 0) {
      const boardPromises = data.jobBoards.map(async (board) => {
        try {
          await dynamodbService.createJobBoard({
            ...board,
            userId: user.id,
            boardId: board.boardId || `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: board.createdAt || new Date().toISOString(),
            updatedAt: board.updatedAt || new Date().toISOString()
          });
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Board ${board.boardId}: ${errorMessage}`);
          return false;
        }
      });
      
      const results = await Promise.allSettled(boardPromises);
      migrationResult.jobBoards = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
    }
    
    // Migrate board preferences
    if (data.boardPreferences && data.boardPreferences.length > 0) {
      try {
        await dynamodbService.initializeUserJobBoards(user.id, data.boardPreferences);
      } catch (err) {
        errors.push(`Board preferences: ${err instanceof Error ? err.message : 'Failed to migrate'}`);
      }
    }
    
    // Migrate search results
    if (data.searchResults && data.searchResults.length > 0) {
      const resultsPromises = data.searchResults.map(async (result) => {
        try {
          await dynamodbService.saveJobSearchResults({
            ...result,
            userId: user.id,
            updatedAt: result.updatedAt || new Date().toISOString(),
            ttl: undefined // Remove TTL for authenticated users
          });
          return true;
        } catch (err) {
          errors.push(`Search result: Failed to migrate`);
          return false;
        }
      });
      
      const results = await Promise.allSettled(resultsPromises);
      migrationResult.searchResults = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
    }
    
    // Migrate profile
    if (data.profile) {
      try {
        await dynamodbService.saveUserProfile({
          ...data.profile,
          userId: user.id,
          createdAt: data.profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        migrationResult.profile = true;
      } catch (err) {
        errors.push(`Profile: ${err instanceof Error ? err.message : 'Failed to migrate'}`);
      }
    }
    
    // Migrate anonymous session data if anonymousId provided
    if (data.anonymousId) {
      try {
        // Get all search results for the anonymous user
        const searchResults = await dynamodbService.getSearchResultsByAnonymousId(data.anonymousId);
        
        if (searchResults.length > 0) {
          // Get master searches
          const masterSearches = await dynamodbService.getMasterSearchesByAnonymousId(data.anonymousId);
          
          // Migrate master searches
          for (const search of masterSearches) {
            try {
              await dynamodbService.createMasterSearch({
                ...search,
                userId: user.id,
                anonymousId: undefined,
                ttl: undefined
              });
            } catch (err) {
              console.error(`Failed to migrate master search ${search.searchId}:`, err);
            }
          }
          
          // Migrate remaining search results not already migrated
          for (const result of searchResults) {
            // Check if this result was already migrated above
            const alreadyMigrated = data.searchResults?.some(
              r => r.searchId === result.searchId
            );
            
            if (!alreadyMigrated) {
              try {
                await dynamodbService.saveJobSearchResults({
                  ...result,
                  userId: user.id,
                  anonymousId: undefined,
                  ttl: undefined
                });
                migrationResult.searchResults++;
              } catch (err) {
                console.error(`Failed to migrate search result:`, err);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to migrate anonymous session data:', error);
        errors.push('Some anonymous session data could not be migrated');
      }
    }
    
    // Return migration results
    return NextResponse.json({
      success: errors.length === 0,
      migrated: migrationResult,
      errors,
      message: errors.length === 0
        ? 'Migration completed successfully'
        : `Migration completed with ${errors.length} error(s)`
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
});