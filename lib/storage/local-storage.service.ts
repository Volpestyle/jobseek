import {
  SavedJob,
  SavedSearch,
  JobApplication,
  JobBoard,
  JobSearchResult,
  UserProfile,
} from "../db/dynamodb.service";
import { MIGRATION_KEYS } from "../migration/migration.service";

// Use unified storage keys from migration service
const STORAGE_KEYS = {
  SAVED_JOBS: MIGRATION_KEYS.SAVED_JOBS,
  SAVED_SEARCHES: MIGRATION_KEYS.SAVED_SEARCHES,
  APPLICATIONS: MIGRATION_KEYS.APPLICATIONS,
  JOB_BOARDS: MIGRATION_KEYS.JOB_BOARDS,
  USER_ID: MIGRATION_KEYS.ANONYMOUS_ID,
  USER_SAVED_BOARDS: MIGRATION_KEYS.USER_SAVED_BOARDS,
  USER_INITIALIZED: "jobseek_user_initialized",
  SEARCHES_INITIALIZED: "jobseek_searches_initialized",
  USER_PROFILE: MIGRATION_KEYS.USER_PROFILE,
  JOB_SEARCH_RESULTS: MIGRATION_KEYS.SEARCH_RESULTS,
};

export class LocalStorageService {
  private userId: string;

  constructor() {
    // Initialize userId with a placeholder - will be set in browser
    this.userId = "";

    // Only access localStorage in browser environment
    if (typeof window !== "undefined") {
      // Generate or retrieve anonymous user ID
      const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
      if (storedUserId) {
        this.userId = storedUserId;
      } else {
        this.userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(STORAGE_KEYS.USER_ID, this.userId);
      }
    }
  }

  // Helper methods
  private getItems<T>(key: string): T[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return [];
    }
  }

  private setItems<T>(key: string, items: T[]): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
      throw new Error("Failed to save data to local storage");
    }
  }

  private findItemIndex<T extends { userId: string }>(
    items: T[],
    itemId: string,
    idField: Extract<keyof T, string>
  ): number {
    // For anonymous users, just match by ID since data is local to browser
    return items.findIndex((item) => {
      const value = item[idField];
      return value !== undefined && String(value) === itemId;
    });
  }

  // Saved Jobs
  async saveJob(job: SavedJob): Promise<SavedJob> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS);
    const existingIndex = this.findItemIndex(jobs, job.jobId, "jobId");

    const jobWithUserId = { ...job, userId: this.userId };

    if (existingIndex >= 0) {
      jobs[existingIndex] = jobWithUserId;
    } else {
      jobs.push(jobWithUserId);
    }

    this.setItems(STORAGE_KEYS.SAVED_JOBS, jobs);
    return jobWithUserId;
  }

  async getSavedJob(_userId: string, jobId: string): Promise<SavedJob | null> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS);
    // For anonymous users, just match by jobId since data is local to browser
    return jobs.find((job) => job.jobId === jobId) || null;
  }

  async getSavedJobs(_userId: string): Promise<SavedJob[]> {
    void _userId;
    // For anonymous users, return all jobs since data is local to browser
    return this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS);
  }

  async deleteSavedJob(_userId: string, jobId: string): Promise<void> {
    const jobs = this.getItems<SavedJob>(STORAGE_KEYS.SAVED_JOBS);
    // For anonymous users, just filter by jobId since data is local to browser
    const filteredJobs = jobs.filter((job) => job.jobId !== jobId);
    this.setItems(STORAGE_KEYS.SAVED_JOBS, filteredJobs);
  }

  // Saved Searches
  async saveSearch(search: SavedSearch): Promise<SavedSearch> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES);
    const existingIndex = this.findItemIndex(
      searches,
      search.searchId,
      "searchId"
    );

    const searchWithUserId = { ...search, userId: this.userId };

    if (existingIndex >= 0) {
      searches[existingIndex] = searchWithUserId;
    } else {
      searches.push(searchWithUserId);
    }

    this.setItems(STORAGE_KEYS.SAVED_SEARCHES, searches);
    return searchWithUserId;
  }

  async getSavedSearch(
    _userId: string,
    searchId: string
  ): Promise<SavedSearch | null> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES);
    // For anonymous users, just match by searchId since data is local to browser
    return searches.find((search) => search.searchId === searchId) || null;
  }

  async getSavedSearches(_userId: string): Promise<SavedSearch[]> {
    void _userId;
    // For anonymous users, return all searches since data is local to browser
    return this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES);
  }

  async updateSearchLastRun(_userId: string, searchId: string): Promise<void> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES);
    const index = this.findItemIndex(searches, searchId, "searchId");

    if (index >= 0) {
      searches[index].lastRunAt = new Date().toISOString();
      searches[index].updatedAt = new Date().toISOString();
      this.setItems(STORAGE_KEYS.SAVED_SEARCHES, searches);
    }
  }

  async updateSavedSearch(search: SavedSearch): Promise<SavedSearch> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES);
    const index = this.findItemIndex(searches, search.searchId, "searchId");

    if (index >= 0) {
      const updatedSearch = {
        ...search,
        userId: this.userId, // Ensure we use the correct userId
        updatedAt: new Date().toISOString(),
      };
      searches[index] = updatedSearch;
      this.setItems(STORAGE_KEYS.SAVED_SEARCHES, searches);
      return updatedSearch;
    }

    // If not found, it might be a new search - save it instead
    console.warn(
      `Search not found for update: ${search.searchId}, saving as new search`
    );
    return this.saveSearch(search);
  }

  async deleteSavedSearch(_userId: string, searchId: string): Promise<void> {
    const searches = this.getItems<SavedSearch>(STORAGE_KEYS.SAVED_SEARCHES);
    // For anonymous users, just filter by searchId since data is local to browser
    const filteredSearches = searches.filter(
      (search) => search.searchId !== searchId
    );
    this.setItems(STORAGE_KEYS.SAVED_SEARCHES, filteredSearches);
  }

  // Job Applications
  async saveApplication(application: JobApplication): Promise<JobApplication> {
    const applications = this.getItems<JobApplication>(
      STORAGE_KEYS.APPLICATIONS
    );
    const existingIndex = this.findItemIndex(
      applications,
      application.applicationId,
      "applicationId"
    );

    const applicationWithUserId = { ...application, userId: this.userId };

    if (existingIndex >= 0) {
      applications[existingIndex] = applicationWithUserId;
    } else {
      applications.push(applicationWithUserId);
    }

    this.setItems(STORAGE_KEYS.APPLICATIONS, applications);
    return applicationWithUserId;
  }

  async getApplication(
    _userId: string,
    applicationId: string
  ): Promise<JobApplication | null> {
    const applications = this.getItems<JobApplication>(
      STORAGE_KEYS.APPLICATIONS
    );
    // For anonymous users, just match by applicationId since data is local to browser
    return applications.find((app) => app.applicationId === applicationId) || null;
  }

  async getApplications(_userId: string): Promise<JobApplication[]> {
    void _userId;
    // For anonymous users, return all applications since data is local to browser
    return this.getItems<JobApplication>(STORAGE_KEYS.APPLICATIONS);
  }

  async updateApplicationStatus(
    _userId: string,
    applicationId: string,
    status: JobApplication["status"],
    notes?: string
  ): Promise<void> {
    const applications = this.getItems<JobApplication>(
      STORAGE_KEYS.APPLICATIONS
    );
    const index = this.findItemIndex(
      applications,
      applicationId,
      "applicationId"
    );

    if (index >= 0) {
      applications[index].status = status;
      if (notes) {
        applications[index].notes = notes;
      }
      this.setItems(STORAGE_KEYS.APPLICATIONS, applications);
    }
  }

  // Job Boards
  async createJobBoard(board: JobBoard): Promise<JobBoard> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS);
    const boardWithUserId = { ...board, userId: this.userId };
    boards.push(boardWithUserId);
    this.setItems(STORAGE_KEYS.JOB_BOARDS, boards);
    return boardWithUserId;
  }

  async getJobBoard(_userId: string, boardId: string): Promise<JobBoard | null> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS);
    // For anonymous users, just match by boardId since data is local to browser
    return boards.find((board) => board.boardId === boardId) || null;
  }

  async getJobBoards(_userId: string): Promise<JobBoard[]> {
    void _userId;
    // For anonymous users, return all boards since data is local to browser
    return this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS);
  }

  async addJobToBoard(
    _userId: string,
    boardId: string,
    jobId: string
  ): Promise<void> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS);
    const index = this.findItemIndex(boards, boardId, "boardId");

    if (index >= 0 && !boards[index].jobIds.includes(jobId)) {
      boards[index].jobIds.push(jobId);
      boards[index].updatedAt = new Date().toISOString();
      this.setItems(STORAGE_KEYS.JOB_BOARDS, boards);
    }
  }

  async removeJobFromBoard(
    _userId: string,
    boardId: string,
    jobId: string
  ): Promise<void> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS);
    const index = this.findItemIndex(boards, boardId, "boardId");

    if (index >= 0) {
      boards[index].jobIds = boards[index].jobIds.filter((id: string) => id !== jobId);
      boards[index].updatedAt = new Date().toISOString();
      this.setItems(STORAGE_KEYS.JOB_BOARDS, boards);
    }
  }

  async deleteJobBoard(_userId: string, boardId: string): Promise<void> {
    const boards = this.getItems<JobBoard>(STORAGE_KEYS.JOB_BOARDS);
    // For anonymous users, just filter by boardId since data is local to browser
    const filteredBoards = boards.filter(
      (board) => board.boardId !== boardId
    );
    this.setItems(STORAGE_KEYS.JOB_BOARDS, filteredBoards);
  }

  // User Board Preferences
  async initializeUserJobBoards(
    _userId: string,
    boardIds: string[]
  ): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const initialized = localStorage.getItem(STORAGE_KEYS.USER_INITIALIZED);
    if (!initialized) {
      localStorage.setItem(
        STORAGE_KEYS.USER_SAVED_BOARDS,
        JSON.stringify(boardIds)
      );
      localStorage.setItem(STORAGE_KEYS.USER_INITIALIZED, "true");
    }
  }

  async isUserInitialized(_userId: string): Promise<boolean> {
    void _userId;
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem(STORAGE_KEYS.USER_INITIALIZED) === "true";
  }

  async getUserSavedBoards(_userId: string): Promise<string[]> {
    void _userId;
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const boards = localStorage.getItem(STORAGE_KEYS.USER_SAVED_BOARDS);
      return boards ? JSON.parse(boards) : [];
    } catch (error) {
      console.error("Error reading saved boards:", error);
      return [];
    }
  }

  async saveUserBoardPreference(
    _userId: string,
    boardId: string,
    saved: boolean
  ): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const boards = await this.getUserSavedBoards(this.userId);
      let updatedBoards: string[];

      if (saved) {
        updatedBoards = boards.includes(boardId)
          ? boards
          : [...boards, boardId];
      } else {
        updatedBoards = boards.filter((id) => id !== boardId);
      }

      localStorage.setItem(
        STORAGE_KEYS.USER_SAVED_BOARDS,
        JSON.stringify(updatedBoards)
      );
    } catch (error) {
      console.error("Error saving board preference:", error);
      throw new Error("Failed to save board preference");
    }
  }

  // Saved Searches Initialization
  async initializeDefaultSearches(
    _userId: string,
    searches: Omit<SavedSearch, "userId">[]
  ): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const initialized = localStorage.getItem(STORAGE_KEYS.SEARCHES_INITIALIZED);
    if (!initialized) {
      // Save default searches
      const searchesToSave = searches.map((search) => ({
        ...search,
        userId: this.userId,
      }));

      const existingSearches = this.getItems<SavedSearch>(
        STORAGE_KEYS.SAVED_SEARCHES
      );
      this.setItems(STORAGE_KEYS.SAVED_SEARCHES, [
        ...existingSearches,
        ...searchesToSave,
      ]);

      localStorage.setItem(STORAGE_KEYS.SEARCHES_INITIALIZED, "true");
    }
  }

  async hasInitializedSearches(_userId: string): Promise<boolean> {
    void _userId;
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem(STORAGE_KEYS.SEARCHES_INITIALIZED) === "true";
  }

  async markSearchesInitialized(_userId: string): Promise<void> {
    void _userId;
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(STORAGE_KEYS.SEARCHES_INITIALIZED, "true");
  }

  // Job Search Results
  async saveJobSearchResults(
    results: JobSearchResult
  ): Promise<JobSearchResult> {
    if (typeof window === "undefined") {
      throw new Error("Local storage is not available");
    }

    const allResults = this.getItems<JobSearchResult>(
      STORAGE_KEYS.JOB_SEARCH_RESULTS
    );
    const existingIndex = allResults.findIndex(
      (r) =>
        r.userId === this.userId &&
        r.searchId === results.searchId
    );

    const resultWithUserId = {
      ...results,
      userId: this.userId,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      allResults[existingIndex] = resultWithUserId;
    } else {
      allResults.push(resultWithUserId);
    }

    this.setItems(STORAGE_KEYS.JOB_SEARCH_RESULTS, allResults);
    return resultWithUserId;
  }

  async getJobSearchResults(
    _userId: string,
    searchId: string
  ): Promise<JobSearchResult | null> {
    const results = this.getItems<JobSearchResult>(
      STORAGE_KEYS.JOB_SEARCH_RESULTS
    );
    return (
      results.find(
        (r) => r.userId === this.userId && r.searchId === searchId
      ) || null
    );
  }

  async updateJobSearchResults(
    _userId: string,
    searchId: string,
    updates: Partial<JobSearchResult>
  ): Promise<JobSearchResult> {
    const currentResults = await this.getJobSearchResults(
      this.userId,
      searchId
    );
    if (!currentResults) {
      throw new Error("Job search results not found");
    }

    const updatedResults = {
      ...currentResults,
      ...updates,
      userId: this.userId,
      searchId: searchId,
      updatedAt: new Date().toISOString(),
    };

    return this.saveJobSearchResults(updatedResults);
  }

  async getAllJobSearchResults(_userId: string): Promise<JobSearchResult[]> {
    void _userId;
    const results = this.getItems<JobSearchResult>(
      STORAGE_KEYS.JOB_SEARCH_RESULTS
    );
    return results.filter((r) => r.userId === this.userId);
  }

  // User Profile
  async getUserProfile(_userId: string): Promise<UserProfile | null> {
    void _userId;
    if (typeof window === "undefined") {
      return null;
    }

    const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!profileData) {
      return null;
    }

    try {
      return JSON.parse(profileData) as UserProfile;
    } catch (error) {
      console.error("Error parsing profile data:", error);
      return null;
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    if (typeof window === "undefined") {
      return profile;
    }

    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    return profile;
  }

  async updateUserProfile(
    _userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    const currentProfile = await this.getUserProfile(this.userId);
    const baseProfile =
      currentProfile ??
      ({
        userId: this.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as UserProfile);

    const updatedProfile: UserProfile = {
      ...baseProfile,
      ...updates,
      userId: this.userId,
      updatedAt: new Date().toISOString(),
    };

    return this.saveUserProfile(updatedProfile);
  }

  // Data export for migration
  async exportAllData() {
    const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    let profile = null;
    if (profileData) {
      try {
        profile = JSON.parse(profileData);
      } catch (e) {
        console.error("Failed to parse profile data:", e);
      }
    }

    return {
      userId: this.userId,
      savedJobs: await this.getSavedJobs(this.userId),
      savedSearches: await this.getSavedSearches(this.userId),
      applications: await this.getApplications(this.userId),
      jobBoards: await this.getJobBoards(this.userId),
      savedBoardIds: await this.getUserSavedBoards(this.userId),
      jobSearchResults: await this.getAllJobSearchResults(this.userId),
      profile,
    };
  }

  // Clear all local data
  async clearAllData() {
    if (typeof window === "undefined") {
      return;
    }

    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }
}

// Create a singleton instance only in browser environment
let instance: LocalStorageService | null = null;

export const getLocalStorageService = (): LocalStorageService => {
  if (!instance) {
    instance = new LocalStorageService();
  }
  return instance;
};

export const localStorageService =
  typeof window !== "undefined"
    ? new LocalStorageService()
    : ({} as LocalStorageService);
