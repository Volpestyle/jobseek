import {
  SavedJob,
  SavedSearch,
  JobApplication,
  JobBoard,
  UserProfile
} from '../db/dynamodb.service'

/**
 * Server-side storage interface with explicit userId parameters
 * Used by API routes and server-side code
 */
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

/**
 * Client-side storage interface that omits userId parameters
 * Used by React components through the auth context
 */
export interface ClientStorageService {
  // User Profile
  getUserProfile?(): Promise<UserProfile | null>
  saveUserProfile?(profile: Omit<UserProfile, 'userId'>): Promise<UserProfile>
  updateUserProfile?(updates: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>): Promise<UserProfile>

  // Saved Jobs
  saveJob(job: Omit<SavedJob, 'userId' | 'savedAt'>): Promise<SavedJob>
  getSavedJob(jobId: string): Promise<SavedJob | null>
  getSavedJobs(): Promise<SavedJob[]>
  deleteSavedJob(jobId: string): Promise<void>

  // Saved Searches
  saveSearch(search: Omit<SavedSearch, 'userId' | 'searchId' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch>
  getSavedSearch(searchId: string): Promise<SavedSearch | null>
  getSavedSearches(): Promise<SavedSearch[]>
  updateSearchLastRun(searchId: string): Promise<void>
  updateSavedSearch(search: Omit<SavedSearch, 'userId'>): Promise<SavedSearch>
  deleteSavedSearch(searchId: string): Promise<void>

  // Job Applications
  saveApplication(application: Omit<JobApplication, 'userId' | 'applicationId' | 'appliedAt'>): Promise<JobApplication>
  getApplication(applicationId: string): Promise<JobApplication | null>
  getApplications(): Promise<JobApplication[]>
  updateApplicationStatus(applicationId: string, status: JobApplication["status"], notes?: string): Promise<void>

  // Job Boards
  createJobBoard(board: Omit<JobBoard, 'userId' | 'boardId' | 'createdAt' | 'updatedAt'>): Promise<JobBoard>
  getJobBoard(boardId: string): Promise<JobBoard | null>
  getJobBoards(): Promise<JobBoard[]>
  addJobToBoard(boardId: string, jobId: string): Promise<void>
  removeJobFromBoard(boardId: string, jobId: string): Promise<void>
  deleteJobBoard(boardId: string): Promise<void>

  // User Board Preferences
  initializeUserJobBoards(boardIds: string[]): Promise<void>
  isUserInitialized(): Promise<boolean>
  getUserSavedBoards(): Promise<string[]>
  saveUserBoardPreference(boardId: string, saved: boolean): Promise<void>

  // Saved Searches Initialization
  initializeDefaultSearches(searches: Omit<SavedSearch, 'userId'>[]): Promise<void>
  hasInitializedSearches(): Promise<boolean>
  markSearchesInitialized(): Promise<void>
}