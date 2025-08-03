import { 
  SavedJob, 
  SavedSearch, 
  JobApplication, 
  JobBoard 
} from '../db/dynamodb.service'

const STORAGE_KEYS = {
  SAVED_JOBS: 'jobseek_saved_jobs',
  SAVED_SEARCHES: 'jobseek_saved_searches',
  APPLICATIONS: 'jobseek_applications',
  JOB_BOARDS: 'jobseek_job_boards',
  USER_ID: 'jobseek_anonymous_user_id',
  USER_SAVED_BOARDS: 'jobseek_user_saved_boards',
  USER_INITIALIZED: 'jobseek_user_initialized',
  SEARCHES_INITIALIZED: 'jobseek_searches_initialized',
  USER_PROFILE: 'jobseek_profile',
}

export class LocalStorageService {
  private userId: string

  constructor() {
    // Initialize userId with a placeholder - will be set in browser
    this.userId = ''
    
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      // Generate or retrieve anonymous user ID
      const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID)
      if (storedUserId) {
        this.userId = storedUserId
      } else {
        this.userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem(STORAGE_KEYS.USER_ID, this.userId)
      }
    }
  }

  // Helper methods
  private getItems<T>(key: string): T[] {
    if (typeof window === 'undefined') {
      return []
    }
    
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error)
      return []
    }
  }

  private setItems<T>(key: string, items: T[]): void {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(items))
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error)
      throw new Error('Failed to save data to local storage')
    }
  }

  private findItemIndex<T extends { userId: string; [key: string]: any }>(
    items: T[],
    itemId: string,
    idField: string
  ): number {
    return items.findIndex(item => 
      item.userId === this.userId && item[idField] === itemId
    )
  }

  // Saved Jobs
  async saveJob(job: SavedJob): Promise<SavedJob> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS)
    const existingIndex = this.findItemIndex(jobs, job.jobId, 'jobId')
    
    const jobWithUserId = { ...job, userId: this.userId }
    
    if (existingIndex >= 0) {
      jobs[existingIndex] = jobWithUserId
    } else {
      jobs.push(jobWithUserId)
    }
    
    this.setItems(STORAGE_KEYS.SAVED_JOBS, jobs)
    return jobWithUserId
  }

  async getSavedJob(userId: string, jobId: string): Promise<SavedJob | null> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS)
    return jobs.find(job => 
      job.userId === this.userId && job.jobId === jobId
    ) || null
  }

  async getSavedJobs(userId: string): Promise<SavedJob[]> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS)
    return jobs.filter(job => job.userId === this.userId)
  }

  async deleteSavedJob(userId: string, jobId: string): Promise<void> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS)
    const filteredJobs = jobs.filter(job => 
      !(job.userId === this.userId && job.jobId === jobId)
    )
    this.setItems(STORAGE_KEYS.SAVED_JOBS, filteredJobs)
  }

  // Saved Searches
  async saveSearch(search: SavedSearch): Promise<SavedSearch> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
    const existingIndex = this.findItemIndex(searches, search.searchId, 'searchId')
    
    const searchWithUserId = { ...search, userId: this.userId }
    
    if (existingIndex >= 0) {
      searches[existingIndex] = searchWithUserId
    } else {
      searches.push(searchWithUserId)
    }
    
    this.setItems(STORAGE_KEYS.SAVED_SEARCHES, searches)
    return searchWithUserId
  }

  async getSavedSearch(userId: string, searchId: string): Promise<SavedSearch | null> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
    return searches.find(search => 
      search.userId === this.userId && search.searchId === searchId
    ) || null
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
    return searches.filter(search => search.userId === this.userId)
  }

  async updateSearchLastRun(userId: string, searchId: string): Promise<void> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
    const index = this.findItemIndex(searches, searchId, 'searchId')
    
    if (index >= 0) {
      searches[index].lastRunAt = new Date().toISOString()
      searches[index].updatedAt = new Date().toISOString()
      this.setItems(STORAGE_KEYS.SAVED_SEARCHES, searches)
    }
  }

  async updateSavedSearch(search: SavedSearch): Promise<SavedSearch> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
    const index = this.findItemIndex(searches, search.searchId, 'searchId')
    
    if (index >= 0) {
      const updatedSearch = {
        ...search,
        userId: this.userId, // Ensure we use the correct userId
        updatedAt: new Date().toISOString(),
      }
      searches[index] = updatedSearch
      this.setItems(STORAGE_KEYS.SAVED_SEARCHES, searches)
      return updatedSearch
    }
    
    // If not found, it might be a new search - save it instead
    console.warn(`Search not found for update: ${search.searchId}, saving as new search`)
    return this.saveSearch(search)
  }

  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
    const filteredSearches = searches.filter(search => 
      !(search.userId === this.userId && search.searchId === searchId)
    )
    this.setItems(STORAGE_KEYS.SAVED_SEARCHES, filteredSearches)
  }

  // Job Applications
  async saveApplication(application: JobApplication): Promise<JobApplication> {
    const applications = this.getItems<JobApplication>(STORAGE_KEYS.APPLICATIONS)
    const existingIndex = this.findItemIndex(applications, application.applicationId, 'applicationId')
    
    const applicationWithUserId = { ...application, userId: this.userId }
    
    if (existingIndex >= 0) {
      applications[existingIndex] = applicationWithUserId
    } else {
      applications.push(applicationWithUserId)
    }
    
    this.setItems(STORAGE_KEYS.APPLICATIONS, applications)
    return applicationWithUserId
  }

  async getApplication(userId: string, applicationId: string): Promise<JobApplication | null> {
    const applications = this.getItems<JobApplication>(STORAGE_KEYS.APPLICATIONS)
    return applications.find(app => 
      app.userId === this.userId && app.applicationId === applicationId
    ) || null
  }

  async getApplications(userId: string): Promise<JobApplication[]> {
    const applications = this.getItems<JobApplication>(STORAGE_KEYS.APPLICATIONS)
    return applications.filter(app => app.userId === this.userId)
  }

  async updateApplicationStatus(
    userId: string, 
    applicationId: string, 
    status: JobApplication["status"],
    notes?: string
  ): Promise<void> {
    const applications = this.getItems<JobApplication>(STORAGE_KEYS.APPLICATIONS)
    const index = this.findItemIndex(applications, applicationId, 'applicationId')
    
    if (index >= 0) {
      applications[index].status = status
      if (notes) {
        applications[index].notes = notes
      }
      this.setItems(STORAGE_KEYS.APPLICATIONS, applications)
    }
  }

  // Job Boards
  async createJobBoard(board: JobBoard): Promise<JobBoard> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS)
    const boardWithUserId = { ...board, userId: this.userId }
    boards.push(boardWithUserId)
    this.setItems(STORAGE_KEYS.JOB_BOARDS, boards)
    return boardWithUserId
  }

  async getJobBoard(userId: string, boardId: string): Promise<JobBoard | null> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS)
    return boards.find(board => 
      board.userId === this.userId && board.boardId === boardId
    ) || null
  }

  async getJobBoards(userId: string): Promise<JobBoard[]> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS)
    return boards.filter(board => board.userId === this.userId)
  }

  async addJobToBoard(userId: string, boardId: string, jobId: string): Promise<void> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS)
    const index = this.findItemIndex(boards, boardId, 'boardId')
    
    if (index >= 0 && !boards[index].jobs.includes(jobId)) {
      boards[index].jobs.push(jobId)
      boards[index].updatedAt = new Date().toISOString()
      this.setItems(STORAGE_KEYS.JOB_BOARDS, boards)
    }
  }

  async removeJobFromBoard(userId: string, boardId: string, jobId: string): Promise<void> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS)
    const index = this.findItemIndex(boards, boardId, 'boardId')
    
    if (index >= 0) {
      boards[index].jobs = boards[index].jobs.filter(id => id !== jobId)
      boards[index].updatedAt = new Date().toISOString()
      this.setItems(STORAGE_KEYS.JOB_BOARDS, boards)
    }
  }

  async deleteJobBoard(userId: string, boardId: string): Promise<void> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS)
    const filteredBoards = boards.filter(board => 
      !(board.userId === this.userId && board.boardId === boardId)
    )
    this.setItems(STORAGE_KEYS.JOB_BOARDS, filteredBoards)
  }

  // User Board Preferences
  async initializeUserJobBoards(userId: string, boardIds: string[]): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }
    
    const initialized = localStorage.getItem(STORAGE_KEYS.USER_INITIALIZED)
    if (!initialized) {
      localStorage.setItem(STORAGE_KEYS.USER_SAVED_BOARDS, JSON.stringify(boardIds))
      localStorage.setItem(STORAGE_KEYS.USER_INITIALIZED, 'true')
    }
  }

  async isUserInitialized(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false
    }
    
    return localStorage.getItem(STORAGE_KEYS.USER_INITIALIZED) === 'true'
  }

  async getUserSavedBoards(userId: string): Promise<string[]> {
    if (typeof window === 'undefined') {
      return []
    }
    
    try {
      const boards = localStorage.getItem(STORAGE_KEYS.USER_SAVED_BOARDS)
      return boards ? JSON.parse(boards) : []
    } catch (error) {
      console.error('Error reading saved boards:', error)
      return []
    }
  }

  async saveUserBoardPreference(userId: string, boardId: string, saved: boolean): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      const boards = await this.getUserSavedBoards(userId)
      let updatedBoards: string[]
      
      if (saved) {
        updatedBoards = boards.includes(boardId) ? boards : [...boards, boardId]
      } else {
        updatedBoards = boards.filter(id => id !== boardId)
      }
      
      localStorage.setItem(STORAGE_KEYS.USER_SAVED_BOARDS, JSON.stringify(updatedBoards))
    } catch (error) {
      console.error('Error saving board preference:', error)
      throw new Error('Failed to save board preference')
    }
  }

  // Saved Searches Initialization
  async initializeDefaultSearches(userId: string, searches: Omit<SavedSearch, 'userId'>[]): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }
    
    const initialized = localStorage.getItem(STORAGE_KEYS.SEARCHES_INITIALIZED)
    if (!initialized) {
      // Save default searches
      const searchesToSave = searches.map(search => ({
        ...search,
        userId: this.userId,
      }))
      
      const existingSearches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES)
      this.setItems(STORAGE_KEYS.SAVED_SEARCHES, [...existingSearches, ...searchesToSave])
      
      localStorage.setItem(STORAGE_KEYS.SEARCHES_INITIALIZED, 'true')
    }
  }

  async hasInitializedSearches(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false
    }
    
    return localStorage.getItem(STORAGE_KEYS.SEARCHES_INITIALIZED) === 'true'
  }

  async markSearchesInitialized(userId: string): Promise<void> {
    if (typeof window === 'undefined') {
      return
    }
    
    localStorage.setItem(STORAGE_KEYS.SEARCHES_INITIALIZED, 'true')
  }

  // User Profile
  async getUserProfile(userId: string): Promise<any | null> {
    if (typeof window === 'undefined') {
      return null
    }
    
    const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE)
    if (!profileData) {
      return null
    }
    
    try {
      return JSON.parse(profileData)
    } catch (error) {
      console.error('Error parsing profile data:', error)
      return null
    }
  }

  async saveUserProfile(profile: any): Promise<any> {
    if (typeof window === 'undefined') {
      return profile
    }
    
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile))
    return profile
  }

  async updateUserProfile(userId: string, updates: any): Promise<any> {
    const currentProfile = await this.getUserProfile(userId)
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      userId,
      updatedAt: new Date().toISOString()
    }
    
    return this.saveUserProfile(updatedProfile)
  }

  // Data export for migration
  async exportAllData() {
    const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE)
    let profile = null
    if (profileData) {
      try {
        profile = JSON.parse(profileData)
      } catch (e) {
        console.error('Failed to parse profile data:', e)
      }
    }
    
    return {
      userId: this.userId,
      savedJobs: await this.getSavedJobs(this.userId),
      savedSearches: await this.getSavedSearches(this.userId),
      applications: await this.getApplications(this.userId),
      jobBoards: await this.getJobBoards(this.userId),
      savedBoardIds: await this.getUserSavedBoards(this.userId),
      profile,
    }
  }

  // Clear all local data
  async clearAllData() {
    if (typeof window === 'undefined') {
      return
    }
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}

// Create a singleton instance only in browser environment
let instance: LocalStorageService | null = null

export const getLocalStorageService = (): LocalStorageService => {
  if (!instance) {
    instance = new LocalStorageService()
  }
  return instance
}

export const localStorageService = typeof window !== 'undefined' 
  ? new LocalStorageService() 
  : ({} as LocalStorageService)