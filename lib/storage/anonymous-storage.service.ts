import type { SavedJob } from "../db/dynamodb.service";
import { MIGRATION_KEYS } from "../migration/migration.service";

export interface StoredSearch {
  searchId: string;  // Master search ID
  searchParams: {
    keywords: string;
    location: string;
    boards: string[];
  };
  totalJobsFound: number;
  timestamp: string;
}

export interface StoredJob extends Omit<SavedJob, 'userId'> {
  savedAt: string;
}

export class AnonymousStorageService {
  // Use unified storage keys from migration service
  private readonly SEARCHES_KEY = 'jobseek_searches'; // Legacy key for search history
  private readonly SAVED_JOBS_KEY = MIGRATION_KEYS.SAVED_JOBS;
  private readonly ANONYMOUS_ID_KEY = MIGRATION_KEYS.ANONYMOUS_ID;
  private readonly MAX_SEARCHES = 20;
  private readonly MAX_SAVED_JOBS = 100;

  // Search history management
  getSearches(): StoredSearch[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  addSearch(search: StoredSearch): void {
    if (typeof window === 'undefined') return;
    
    const searches = this.getSearches();
    
    // Check if search already exists (update if so)
    const existingIndex = searches.findIndex(s => s.searchId === search.searchId);
    if (existingIndex >= 0) {
      searches[existingIndex] = search;
    } else {
      searches.unshift(search);  // Add new search at beginning
    }
    
    // Keep only the most recent searches
    if (searches.length > this.MAX_SEARCHES) {
      searches.splice(this.MAX_SEARCHES);
    }
    
    localStorage.setItem(this.SEARCHES_KEY, JSON.stringify(searches));
  }

  removeSearch(searchId: string): void {
    if (typeof window === 'undefined') return;
    
    const searches = this.getSearches().filter(s => s.searchId !== searchId);
    localStorage.setItem(this.SEARCHES_KEY, JSON.stringify(searches));
  }

  // Saved jobs management for anonymous users
  getSavedJobs(): StoredJob[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.SAVED_JOBS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveJob(job: Omit<StoredJob, 'savedAt'>): boolean {
    if (typeof window === 'undefined') return false;
    
    const jobs = this.getSavedJobs();
    
    // Check if job is already saved
    if (jobs.find(j => j.jobId === job.jobId)) {
      return false; // Job already saved
    }
    
    // Check storage limit
    if (jobs.length >= this.MAX_SAVED_JOBS) {
      throw new Error(`Cannot save more than ${this.MAX_SAVED_JOBS} jobs. Please remove some saved jobs first.`);
    }
    
    // Add job with timestamp
    const savedJob: StoredJob = {
      ...job,
      savedAt: new Date().toISOString()
    };
    
    jobs.unshift(savedJob); // Add at beginning
    localStorage.setItem(this.SAVED_JOBS_KEY, JSON.stringify(jobs));
    return true;
  }

  removeJob(jobId: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const jobs = this.getSavedJobs();
    const filteredJobs = jobs.filter(j => j.jobId !== jobId);
    
    if (filteredJobs.length === jobs.length) {
      return false; // Job not found
    }
    
    localStorage.setItem(this.SAVED_JOBS_KEY, JSON.stringify(filteredJobs));
    return true;
  }

  isJobSaved(jobId: string): boolean {
    return this.getSavedJobs().some(j => j.jobId === jobId);
  }

  // Anonymous ID management
  getAnonymousId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.ANONYMOUS_ID_KEY);
  }

  setAnonymousId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.ANONYMOUS_ID_KEY, id);
  }

  // Clear all anonymous data (called after successful migration)
  clearAll(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.SEARCHES_KEY);
    localStorage.removeItem(this.SAVED_JOBS_KEY);
    localStorage.removeItem(this.ANONYMOUS_ID_KEY);
  }

  // Get data for migration
  getMigrationData(): {
    searches: StoredSearch[];
    savedJobs: StoredJob[];
    anonymousId: string | null;
  } {
    return {
      searches: this.getSearches(),
      savedJobs: this.getSavedJobs(),
      anonymousId: this.getAnonymousId()
    };
  }

  // Storage size management
  getStorageSize(): {
    searches: number;
    savedJobs: number;
    total: number;
    percentUsed: number;
  } {
    if (typeof window === 'undefined') {
      return { searches: 0, savedJobs: 0, total: 0, percentUsed: 0 };
    }

    const searchesSize = new Blob([localStorage.getItem(this.SEARCHES_KEY) || '']).size;
    const savedJobsSize = new Blob([localStorage.getItem(this.SAVED_JOBS_KEY) || '']).size;
    const total = searchesSize + savedJobsSize;
    
    // localStorage typically has a 5-10MB limit
    const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
    const percentUsed = (total / STORAGE_LIMIT) * 100;

    return {
      searches: searchesSize,
      savedJobs: savedJobsSize,
      total,
      percentUsed: Math.round(percentUsed * 100) / 100
    };
  }
}

// Export singleton instance
export const anonymousStorageService = new AnonymousStorageService();