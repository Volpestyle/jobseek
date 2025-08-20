import { 
  SavedJob, 
  SavedSearch, 
  JobApplication, 
  JobBoard,
  UserProfile,
  JobSearchResult 
} from "../db/dynamodb.service";

export type MigrationStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface MigrationProgress {
  totalItems: number;
  processedItems: number;
  currentType: string;
  percentage: number;
}

export interface MigrationResult {
  success: boolean;
  migratedCounts: {
    savedJobs: number;
    savedSearches: number;
    applications: number;
    jobBoards: number;
    searchResults: number;
    profile: boolean;
  };
  errors: string[];
  timestamp: string;
}

export interface MigrationData {
  savedJobs: SavedJob[];
  savedSearches: SavedSearch[];
  applications: JobApplication[];
  jobBoards: JobBoard[];
  searchResults: JobSearchResult[];
  boardPreferences: string[];
  profile: UserProfile | null;
  anonymousId: string | null;
}

// Standardized storage keys
export const MIGRATION_KEYS = {
  // Data keys
  SAVED_JOBS: "jobseek_saved_jobs",
  SAVED_SEARCHES: "jobseek_saved_searches", 
  APPLICATIONS: "jobseek_applications",
  JOB_BOARDS: "jobseek_job_boards",
  SEARCH_RESULTS: "jobseek_job_search_results",
  USER_PROFILE: "jobseek_profile",
  USER_SAVED_BOARDS: "jobseek_user_saved_boards",
  
  // System keys
  ANONYMOUS_ID: "jobseek_anonymous_id",
  MIGRATION_STATUS: "jobseek_migration_status",
  MIGRATION_RESULT: "jobseek_migration_result",
  MIGRATION_VERSION: "jobseek_migration_version"
};

export class MigrationService {
  private static instance: MigrationService;
  private currentVersion = "1.0.0";

  private constructor() {}

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  /**
   * Check if there's any anonymous data to migrate
   */
  hasAnonymousData(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for any data in localStorage
    const hasData = 
      this.hasStoredData(MIGRATION_KEYS.SAVED_JOBS) ||
      this.hasStoredData(MIGRATION_KEYS.SAVED_SEARCHES) ||
      this.hasStoredData(MIGRATION_KEYS.APPLICATIONS) ||
      this.hasStoredData(MIGRATION_KEYS.JOB_BOARDS) ||
      this.hasStoredData(MIGRATION_KEYS.SEARCH_RESULTS) ||
      this.hasStoredData(MIGRATION_KEYS.USER_PROFILE) ||
      this.hasAnonymousId();

    return hasData;
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus {
    if (typeof window === 'undefined') return 'pending';

    const status = localStorage.getItem(MIGRATION_KEYS.MIGRATION_STATUS);
    return (status as MigrationStatus) || (this.hasAnonymousData() ? 'pending' : 'completed');
  }

  /**
   * Set migration status
   */
  setMigrationStatus(status: MigrationStatus): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MIGRATION_KEYS.MIGRATION_STATUS, status);
  }

  /**
   * Get anonymous ID
   */
  getAnonymousId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(MIGRATION_KEYS.ANONYMOUS_ID);
  }

  /**
   * Set anonymous ID
   */
  setAnonymousId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MIGRATION_KEYS.ANONYMOUS_ID, id);
  }

  /**
   * Collect all anonymous data for migration
   */
  collectMigrationData(): MigrationData {
    const data: MigrationData = {
      savedJobs: [],
      savedSearches: [],
      applications: [],
      jobBoards: [],
      searchResults: [],
      boardPreferences: [],
      profile: null,
      anonymousId: this.getAnonymousId()
    };

    if (typeof window === 'undefined') return data;

    // Collect saved jobs
    data.savedJobs = this.getStoredItems<SavedJob>(MIGRATION_KEYS.SAVED_JOBS);

    // Collect saved searches
    data.savedSearches = this.getStoredItems<SavedSearch>(MIGRATION_KEYS.SAVED_SEARCHES);

    // Collect applications
    data.applications = this.getStoredItems<JobApplication>(MIGRATION_KEYS.APPLICATIONS);

    // Collect job boards
    data.jobBoards = this.getStoredItems<JobBoard>(MIGRATION_KEYS.JOB_BOARDS);

    // Collect search results
    data.searchResults = this.getStoredItems<JobSearchResult>(MIGRATION_KEYS.SEARCH_RESULTS);

    // Collect board preferences
    const boardPrefs = localStorage.getItem(MIGRATION_KEYS.USER_SAVED_BOARDS);
    if (boardPrefs) {
      try {
        data.boardPreferences = JSON.parse(boardPrefs);
      } catch (e) {
        console.error('Failed to parse board preferences:', e);
      }
    }

    // Collect profile
    const profileData = localStorage.getItem(MIGRATION_KEYS.USER_PROFILE);
    if (profileData) {
      try {
        data.profile = JSON.parse(profileData);
      } catch (e) {
        console.error('Failed to parse profile data:', e);
      }
    }

    return data;
  }

  /**
   * Get a preview of what will be migrated
   */
  getMigrationPreview(): {
    counts: {
      savedJobs: number;
      savedSearches: number;
      applications: number;
      jobBoards: number;
      searchResults: number;
      hasProfile: boolean;
    };
    totalSize: number;
  } {
    const data = this.collectMigrationData();
    
    return {
      counts: {
        savedJobs: data.savedJobs.length,
        savedSearches: data.savedSearches.length,
        applications: data.applications.length,
        jobBoards: data.jobBoards.length,
        searchResults: data.searchResults.length,
        hasProfile: !!data.profile
      },
      totalSize: this.calculateDataSize(data)
    };
  }

  /**
   * Perform the migration
   */
  async migrate(
    userId: string,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    this.setMigrationStatus('in_progress');
    
    const data = this.collectMigrationData();
    const result: MigrationResult = {
      success: false,
      migratedCounts: {
        savedJobs: 0,
        savedSearches: 0,
        applications: 0,
        jobBoards: 0,
        searchResults: 0,
        profile: false
      },
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Calculate total items for progress tracking
      const totalItems = 
        data.savedJobs.length + 
        data.savedSearches.length + 
        data.applications.length + 
        data.jobBoards.length + 
        data.searchResults.length + 
        (data.profile ? 1 : 0);
      
      let processedItems = 0;

      // Helper function to update progress
      const updateProgress = (type: string, increment: number = 1) => {
        processedItems += increment;
        if (onProgress) {
          onProgress({
            totalItems,
            processedItems,
            currentType: type,
            percentage: Math.round((processedItems / totalItems) * 100)
          });
        }
      };

      // Call the migration API
      const response = await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          data,
          version: this.currentVersion
        })
      });

      if (!response.ok) {
        throw new Error(`Migration API failed: ${response.status}`);
      }

      const apiResult = await response.json();
      
      // Update result with API response
      if (apiResult.migrated) {
        result.migratedCounts = apiResult.migrated;
        result.errors = apiResult.errors || [];
      }

      result.success = apiResult.success;

      if (result.success) {
        // Clear local storage after successful migration
        this.clearMigratedData();
        this.setMigrationStatus('completed');
        
        // Store migration result for reference
        localStorage.setItem(
          MIGRATION_KEYS.MIGRATION_RESULT, 
          JSON.stringify(result)
        );
      } else {
        this.setMigrationStatus('failed');
      }

    } catch (error) {
      console.error('Migration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.setMigrationStatus('failed');
    }

    return result;
  }

  /**
   * Clear migrated data from localStorage
   */
  clearMigratedData(): void {
    if (typeof window === 'undefined') return;

    // Clear data keys
    [
      MIGRATION_KEYS.SAVED_JOBS,
      MIGRATION_KEYS.SAVED_SEARCHES,
      MIGRATION_KEYS.APPLICATIONS,
      MIGRATION_KEYS.JOB_BOARDS,
      MIGRATION_KEYS.SEARCH_RESULTS,
      MIGRATION_KEYS.USER_PROFILE,
      MIGRATION_KEYS.USER_SAVED_BOARDS,
      MIGRATION_KEYS.ANONYMOUS_ID
    ].forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get last migration result
   */
  getLastMigrationResult(): MigrationResult | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(MIGRATION_KEYS.MIGRATION_RESULT);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse migration result:', e);
      return null;
    }
  }

  // Helper methods
  private hasStoredData(key: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const data = localStorage.getItem(key);
    if (!data) return false;
    
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.length > 0 : !!parsed;
    } catch {
      return false;
    }
  }

  private hasAnonymousId(): boolean {
    return !!this.getAnonymousId();
  }

  private getStoredItems<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`Failed to parse ${key}:`, e);
      return [];
    }
  }

  private calculateDataSize(data: MigrationData): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }
}

// Export singleton instance
export const migrationService = MigrationService.getInstance();