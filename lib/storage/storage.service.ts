import {
  SavedJob,
  SavedSearch,
  JobApplication,
  JobBoard,
  JobSearchResult,
  DynamoDBSingleTableService,
  dynamodbService,
} from "../db/dynamodb.service";
import {
  localStorageService,
  LocalStorageService,
} from "./local-storage.service";
import type { UserProfile } from "../db/dynamodb.service";
import { StorageService } from "./storage.interface";

class UnifiedStorageService {
  private dynamoService: DynamoDBSingleTableService = dynamodbService;
  private localService: LocalStorageService | null = null;

  private getLocalService(): LocalStorageService {
    if (!this.localService && typeof window !== "undefined") {
      this.localService = localStorageService;
    }
    return this.localService!;
  }

  private getService(isAuthenticated: boolean): StorageService {
    return isAuthenticated ? this.dynamoService : this.getLocalService();
  }

  // Client-side only method for components
  async getStorageForUser(userId: string | null): Promise<StorageService> {
    const isAuthenticated = !!userId && !userId.startsWith("anon_");
    return this.getService(isAuthenticated);
  }

  // Server-side method for API routes
  async getStorageForSession(session: any): Promise<StorageService | null> {
    if (session?.user?.id) {
      return this.dynamoService;
    }
    // For anonymous users in API routes, return null
    // The API will handle this appropriately
    return null;
  }

  // Migration helper
  async migrateAnonymousData(authenticatedUserId: string): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Migration can only be performed in browser environment");
    }

    try {
      const localService = this.getLocalService();

      // Export all data from local storage
      const anonymousData = await localService.exportAllData();

      // Migrate saved jobs
      for (const job of anonymousData.savedJobs) {
        await this.dynamoService.saveJob({
          ...job,
          userId: authenticatedUserId,
        });
      }

      // Migrate saved searches
      for (const search of anonymousData.savedSearches) {
        await this.dynamoService.saveSearch({
          ...search,
          userId: authenticatedUserId,
          searchId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      // Migrate applications
      for (const application of anonymousData.applications) {
        await this.dynamoService.saveApplication({
          ...application,
          userId: authenticatedUserId,
          applicationId: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      // Migrate job boards
      for (const board of anonymousData.jobBoards) {
        await this.dynamoService.createJobBoard({
          ...board,
          userId: authenticatedUserId,
          boardId: `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      // Migrate saved board preferences
      if (
        anonymousData.savedBoardIds &&
        anonymousData.savedBoardIds.length > 0
      ) {
        await this.dynamoService.initializeUserJobBoards(
          authenticatedUserId,
          anonymousData.savedBoardIds
        );
      }

      // Migrate job search results
      if (anonymousData.jobSearchResults) {
        for (const searchResult of anonymousData.jobSearchResults) {
          await this.dynamoService.saveJobSearchResults({
            ...searchResult,
            userId: authenticatedUserId,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Migrate profile data if exists
      if (anonymousData.profile) {
        // Import single table service
        const { dynamodbService: singleTableService } = await import(
          "../db/dynamodb.service"
        );
        await singleTableService.saveUserProfile({
          ...anonymousData.profile,
          userId: authenticatedUserId,
          createdAt:
            anonymousData.profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Clear local storage after successful migration
      await localService.clearAllData();

      // Mark migration as complete
      localStorage.setItem("jobseek_migration_complete", "true");
    } catch (error) {
      console.error("Failed to migrate anonymous data:", error);
      throw error;
    }
  }
}

export const storageService = new UnifiedStorageService();
export type {
  SavedJob,
  SavedSearch,
  JobApplication,
  JobBoard,
  UserProfile,
  JobSearchResult,
};
export type { StorageService } from "./storage.interface";
