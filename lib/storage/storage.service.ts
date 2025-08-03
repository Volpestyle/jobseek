import {
  SavedJob,
  SavedSearch,
  JobApplication,
  JobBoard,
  dynamodbService,
  DynamoDBSingleTableService as DynamoDBService
} from '../db/dynamodb.service'
import { localStorageService, LocalStorageService } from './local-storage.service'
import type { UserProfile } from '../db/dynamodb.service'

export interface StorageService {
  // User Profile
  getUserProfile?(userId: string): Promise<UserProfile | null>
  saveUserProfile?(profile: UserProfile): Promise<UserProfile>
  updateUserProfile?(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>

  // Saved Jobs
  saveJob(job: SavedJob): Promise<SavedJob>
  getSavedJob(userId: string, jobId: string): Promise<SavedJob | null>
  getSavedJobs(userId: string): Promise<SavedJob[]>
  deleteSavedJob(userId: string, jobId: string): Promise<void>

  // Saved Searches
  saveSearch(search: SavedSearch): Promise<SavedSearch>
  getSavedSearch(userId: string, searchId: string): Promise<SavedSearch | null>
  getSavedSearches(userId: string): Promise<SavedSearch[]>
  updateSearchLastRun(userId: string, searchId: string): Promise<void>
  updateSavedSearch?(search: SavedSearch): Promise<SavedSearch>
  deleteSavedSearch(userId: string, searchId: string): Promise<void>

  // Job Applications
  saveApplication(application: JobApplication): Promise<JobApplication>
  getApplication(userId: string, applicationId: string): Promise<JobApplication | null>
  getApplications(userId: string): Promise<JobApplication[]>
  updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: JobApplication["status"],
    notes?: string
  ): Promise<void>

  // Job Boards
  createJobBoard(board: JobBoard): Promise<JobBoard>
  getJobBoard(userId: string, boardId: string): Promise<JobBoard | null>
  getJobBoards(userId: string): Promise<JobBoard[]>
  addJobToBoard(userId: string, boardId: string, jobId: string): Promise<void>
  removeJobFromBoard(userId: string, boardId: string, jobId: string): Promise<void>
  deleteJobBoard(userId: string, boardId: string): Promise<void>

  // User Board Preferences
  initializeUserJobBoards?(userId: string, boardIds: string[]): Promise<void>
  isUserInitialized?(userId: string): Promise<boolean>
  getUserSavedBoards?(userId: string): Promise<string[]>
  saveUserBoardPreference?(userId: string, boardId: string, saved: boolean): Promise<void>

  // Saved Searches Initialization
  initializeDefaultSearches?(userId: string, searches: Omit<SavedSearch, 'userId'>[]): Promise<void>
  hasInitializedSearches?(userId: string): Promise<boolean>
  markSearchesInitialized?(userId: string): Promise<void>
}

class UnifiedStorageService {
  private dynamoService: DynamoDBService = dynamodbService
  private localService: LocalStorageService | null = null

  private getLocalService(): LocalStorageService {
    if (!this.localService && typeof window !== 'undefined') {
      this.localService = localStorageService
    }
    return this.localService!
  }

  private getService(isAuthenticated: boolean): StorageService {
    return isAuthenticated ? this.dynamoService : this.getLocalService()
  }

  // Client-side only method for components
  async getStorageForUser(userId: string | null): Promise<StorageService> {
    const isAuthenticated = !!userId && !userId.startsWith('anon_')
    return this.getService(isAuthenticated)
  }

  // Server-side method for API routes
  async getStorageForSession(session: any): Promise<StorageService | null> {
    if (session?.user?.id) {
      return this.dynamoService
    }
    // For anonymous users in API routes, return null
    // The API will handle this appropriately
    return null
  }

  // Migration helper
  async migrateAnonymousData(authenticatedUserId: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Migration can only be performed in browser environment')
    }

    try {
      const localService = this.getLocalService()

      // Export all data from local storage
      const anonymousData = await localService.exportAllData()

      // Migrate saved jobs
      for (const job of anonymousData.savedJobs) {
        await this.dynamoService.saveJob({
          ...job,
          userId: authenticatedUserId,
        })
      }

      // Migrate saved searches
      for (const search of anonymousData.savedSearches) {
        await this.dynamoService.saveSearch({
          ...search,
          userId: authenticatedUserId,
          searchId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })
      }

      // Migrate applications
      for (const application of anonymousData.applications) {
        await this.dynamoService.saveApplication({
          ...application,
          userId: authenticatedUserId,
          applicationId: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })
      }

      // Migrate job boards
      for (const board of anonymousData.jobBoards) {
        await this.dynamoService.createJobBoard({
          ...board,
          userId: authenticatedUserId,
          boardId: `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })
      }

      // Migrate saved board preferences
      if (anonymousData.savedBoardIds && anonymousData.savedBoardIds.length > 0) {
        await this.dynamoService.initializeUserJobBoards(
          authenticatedUserId,
          anonymousData.savedBoardIds
        )
      }

      // Migrate profile data if exists
      if (anonymousData.profile) {
        // Import single table service
        const { dynamodbService: singleTableService } = await import('../db/dynamodb.service')
        await singleTableService.saveUserProfile({
          ...anonymousData.profile,
          userId: authenticatedUserId,
          createdAt: anonymousData.profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      // Clear local storage after successful migration
      await localService.clearAllData()

      // Mark migration as complete
      localStorage.setItem('jobseek_migration_complete', 'true')
    } catch (error) {
      console.error('Failed to migrate anonymous data:', error)
      throw error
    }
  }
}

export const storageService = new UnifiedStorageService()
export type { SavedJob, SavedSearch, JobApplication, JobBoard }