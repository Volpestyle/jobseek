import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-wrappers";
import { dynamodbService } from "@/lib/db/dynamodb.service";

interface MigrationRequest {
  localSavedJobs?: Array<{
    jobId: string;
    title: string;
    company: string;
    location: string;
    salary?: string;
    url: string;
    description: string;
    source: string;
    savedAt: string;
    tags?: string[];
    notes?: string;
  }>;
  anonymousId?: string;
}

interface MigrationResult {
  jobs: number;
  sessions: number;
  errors: string[];
}

export const POST = withAuth(async (request, context, { user }) => {
  try {
    const body: MigrationRequest = await request.json();
    const { localSavedJobs, anonymousId } = body;
    
    const migrationResults: MigrationResult = { 
      jobs: 0, 
      sessions: 0, 
      errors: [] 
    };
    
    // Migrate saved jobs from localStorage
    if (localSavedJobs && localSavedJobs.length > 0) {
      const jobPromises = localSavedJobs.map(async (job) => {
        try {
          await dynamodbService.saveJob({
            ...job,
            userId: user.id,
            savedAt: job.savedAt || new Date().toISOString()
          });
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          migrationResults.errors.push(`Job ${job.jobId}: ${errorMessage}`);
          return false;
        }
      });
      
      const results = await Promise.allSettled(jobPromises);
      migrationResults.jobs = results.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;
    }
    
    // Migrate anonymous search results if anonymousId provided
    if (anonymousId) {
      try {
        // Get all search results for the anonymous user
        const searchResults = await dynamodbService.getSearchResultsByAnonymousId(anonymousId);
        migrationResults.sessions = searchResults.length;
        
        if (searchResults.length > 0) {
          // Get unique search IDs
          const uniqueSearchIds = [...new Set(searchResults.map(r => r.searchId))];
          
          // Migrate master searches
          const masterSearches = await dynamodbService.getMasterSearchesByAnonymousId(anonymousId);
          for (const search of masterSearches) {
            try {
              // Create new master search with authenticated user ID
              await dynamodbService.createMasterSearch({
                ...search,
                userId: user.id,
                anonymousId: undefined,
                ttl: undefined
              });
            } catch (err) {
              console.error(`Failed to migrate master search ${search.searchId}:`, err);
              migrationResults.errors.push(`Master search ${search.searchId}: Failed to migrate`);
            }
          }
          
          // Migrate all search results
          for (const result of searchResults) {
            try {
              await dynamodbService.saveJobSearchResults({
                ...result,
                userId: user.id,
                anonymousId: undefined,
                ttl: undefined
              });
            } catch (err) {
              console.error(`Failed to migrate search result:`, err);
              migrationResults.errors.push(`Search result migration failed`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to migrate anonymous data:', error);
        migrationResults.errors.push('Failed to migrate anonymous search data');
      }
    }
    
    // Return migration results
    return NextResponse.json({ 
      success: migrationResults.errors.length === 0,
      migrated: {
        jobs: migrationResults.jobs,
        sessions: migrationResults.sessions,
        errors: migrationResults.errors
      },
      message: migrationResults.errors.length === 0 
        ? 'Migration completed successfully' 
        : 'Migration completed with some errors'
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