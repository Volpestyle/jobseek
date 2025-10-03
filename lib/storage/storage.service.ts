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

  async getStorageForUser(userId: string | null): Promise<StorageService> {
    const isAuthenticated = !!userId && !userId.startsWith("anon_");
    if (!isAuthenticated) {
      return this.getLocalService();
    }
    return this.dynamoService;
  }

  // Migration helper - now delegates to the unified migration service
  async migrateAnonymousData(authenticatedUserId: string): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Migration can only be performed in browser environment");
    }

    try {
      // Use the new unified migration service
      const { migrationService } = await import("../migration/migration.service");
      const result = await migrationService.migrate(authenticatedUserId);
      
      if (!result.success) {
        throw new Error(
          result.errors.length > 0
            ? result.errors.join(", ")
            : "Migration failed"
        );
      }
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
