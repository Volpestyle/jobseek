'use client'

import {
  SavedJob,
  SavedSearch,
  JobApplication,
  JobBoard,
  UserProfile
} from '../db/dynamodb.service'
import { localStorageService } from './local-storage.service'
import { ClientStorageService } from './storage.interface'

class ClientStorageServiceImpl implements ClientStorageService {
  constructor(
    private isAuthenticated: boolean,
    private userId: string | null
  ) { }

  // Helper method for API calls
  private async fetchAPI(endpoint: string, options?: RequestInit) {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `API call failed: ${response.status}`)
    }

    return data
  }

  // Saved Jobs
  async saveJob(job: Omit<SavedJob, 'userId' | 'savedAt'>): Promise<SavedJob> {
    const jobData = {
      ...job,
      savedAt: new Date().toISOString(),
    }

    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/jobs/saved', {
        method: 'POST',
        body: JSON.stringify(jobData),
      })
      return data.job
    } else {
      return localStorageService.saveJob({
        ...jobData,
        userId: 'anonymous',
      } as SavedJob)
    }
  }

  async getSavedJob(jobId: string): Promise<SavedJob | null> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI(`/api/jobs/saved/${jobId}`)
      return data.job || null
    } else {
      return localStorageService.getSavedJob('anonymous', jobId)
    }
  }

  async getSavedJobs(): Promise<SavedJob[]> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/jobs/saved')
      return data.jobs || []
    } else {
      return localStorageService.getSavedJobs('anonymous')
    }
  }

  async deleteSavedJob(jobId: string): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/jobs/saved?jobId=${jobId}`, {
        method: 'DELETE',
      })
    } else {
      await localStorageService.deleteSavedJob('anonymous', jobId)
    }
  }

  // Saved Searches
  async saveSearch(search: Omit<SavedSearch, 'userId' | 'searchId' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> {
    const searchData = {
      ...search,
      searchId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/searches/saved', {
        method: 'POST',
        body: JSON.stringify(searchData),
      })
      return data.search
    } else {
      return localStorageService.saveSearch({
        ...searchData,
        userId: 'anonymous',
      } as SavedSearch)
    }
  }

  async getSavedSearch(searchId: string): Promise<SavedSearch | null> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI(`/api/searches/saved/${searchId}`)
      return data.search || null
    } else {
      return localStorageService.getSavedSearch('anonymous', searchId)
    }
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/searches/saved')
      return data.searches || []
    } else {
      return localStorageService.getSavedSearches('anonymous')
    }
  }

  async updateSearchLastRun(searchId: string): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/searches/saved/${searchId}/last-run`, {
        method: 'PUT',
      })
    } else {
      await localStorageService.updateSearchLastRun('anonymous', searchId)
    }
  }

  async updateSavedSearch(search: Omit<SavedSearch, 'userId'>): Promise<SavedSearch> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI(`/api/searches/saved/${search.searchId}`, {
        method: 'PUT',
        body: JSON.stringify(search),
      })
      return data.search
    } else {
      return localStorageService.updateSavedSearch({
        ...search,
        userId: 'anonymous',
      } as SavedSearch)
    }
  }

  async deleteSavedSearch(searchId: string): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/searches/saved?searchId=${searchId}`, {
        method: 'DELETE',
      })
    } else {
      await localStorageService.deleteSavedSearch('anonymous', searchId)
    }
  }

  // Job Applications
  async saveApplication(application: Omit<JobApplication, 'userId' | 'applicationId' | 'appliedAt'>): Promise<JobApplication> {
    const applicationData = {
      ...application,
      applicationId: `app_${Date.now()}`,
      appliedAt: new Date().toISOString(),
    }

    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/applications', {
        method: 'POST',
        body: JSON.stringify(applicationData),
      })
      return data.application
    } else {
      return localStorageService.saveApplication({
        ...applicationData,
        userId: 'anonymous',
      } as JobApplication)
    }
  }

  async getApplication(applicationId: string): Promise<JobApplication | null> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI(`/api/applications/${applicationId}`)
      return data.application || null
    } else {
      return localStorageService.getApplication('anonymous', applicationId)
    }
  }

  async getApplications(): Promise<JobApplication[]> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/applications')
      return data.applications || []
    } else {
      return localStorageService.getApplications('anonymous')
    }
  }

  async updateApplicationStatus(
    applicationId: string,
    status: JobApplication["status"],
    notes?: string
  ): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/applications/${applicationId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes }),
      })
    } else {
      await localStorageService.updateApplicationStatus('anonymous', applicationId, status, notes)
    }
  }

  // Job Boards
  async createJobBoard(board: Omit<JobBoard, 'userId' | 'boardId' | 'createdAt' | 'updatedAt'>): Promise<JobBoard> {
    const boardData = {
      ...board,
      boardId: `board_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      jobs: board.jobIds || [],
    }

    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/boards', {
        method: 'POST',
        body: JSON.stringify(boardData),
      })
      return data.board
    } else {
      return localStorageService.createJobBoard({
        ...boardData,
        userId: 'anonymous',
      } as JobBoard)
    }
  }

  async getJobBoard(boardId: string): Promise<JobBoard | null> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI(`/api/boards/${boardId}`)
      return data.board || null
    } else {
      return localStorageService.getJobBoard('anonymous', boardId)
    }
  }

  async getJobBoards(): Promise<JobBoard[]> {
    if (this.isAuthenticated) {
      const data = await this.fetchAPI('/api/boards')
      return data.boards || []
    } else {
      return localStorageService.getJobBoards('anonymous')
    }
  }

  async addJobToBoard(boardId: string, jobId: string): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/boards/${boardId}/jobs`, {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      })
    } else {
      await localStorageService.addJobToBoard('anonymous', boardId, jobId)
    }
  }

  async removeJobFromBoard(boardId: string, jobId: string): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/boards/${boardId}/jobs/${jobId}`, {
        method: 'DELETE',
      })
    } else {
      await localStorageService.removeJobFromBoard('anonymous', boardId, jobId)
    }
  }

  async deleteJobBoard(boardId: string): Promise<void> {
    if (this.isAuthenticated) {
      await this.fetchAPI(`/api/boards/${boardId}`, {
        method: 'DELETE',
      })
    } else {
      await localStorageService.deleteJobBoard('anonymous', boardId)
    }
  }

  // User Profile
  async getUserProfile(): Promise<UserProfile | null> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI('/api/user/profile')
      return data
    } else {
      return localStorageService.getUserProfile?.('anonymous') || null
    }
  }

  async saveUserProfile(profile: Omit<UserProfile, 'userId'>): Promise<UserProfile> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      })
      return data
    } else {
      const fullProfile: UserProfile = {
        ...profile,
        userId: 'anonymous',
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return localStorageService.saveUserProfile?.(fullProfile) || fullProfile
    }
  }

  async updateUserProfile(updates: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>): Promise<UserProfile> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      return data
    } else {
      const currentProfile = await localStorageService.getUserProfile?.('anonymous')
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates,
        userId: 'anonymous',
        createdAt: currentProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return localStorageService.updateUserProfile?.('anonymous', updates).then(() => updatedProfile) || updatedProfile
    }
  }

  // User Board Preferences
  async initializeUserJobBoards(boardIds: string[]): Promise<void> {
    if (this.isAuthenticated && this.userId) {
      await this.fetchAPI('/api/user/board-preferences/initialize', {
        method: 'POST',
        body: JSON.stringify({ boardIds }),
      })
    } else {
      await localStorageService.initializeUserJobBoards('anonymous', boardIds)
    }
  }

  async isUserInitialized(): Promise<boolean> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI('/api/user/board-preferences/status')
      return data.initialized || false
    } else {
      return localStorageService.isUserInitialized('anonymous')
    }
  }

  async getUserSavedBoards(): Promise<string[]> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI('/api/user/board-preferences')
      return data.savedBoardIds || []
    } else {
      return localStorageService.getUserSavedBoards('anonymous')
    }
  }

  async saveUserBoardPreference(boardId: string, saved: boolean): Promise<void> {
    if (this.isAuthenticated && this.userId) {
      await this.fetchAPI(`/api/user/board-preferences/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify({ saved }),
      })
    } else {
      await localStorageService.saveUserBoardPreference('anonymous', boardId, saved)
    }
  }

  // Saved Searches Initialization
  async initializeDefaultSearches(searches: Omit<SavedSearch, 'userId'>[]): Promise<void> {
    if (this.isAuthenticated && this.userId) {
      await this.fetchAPI('/api/searches/saved/initialize', {
        method: 'POST',
        body: JSON.stringify({ searches }),
      })
    } else {
      await localStorageService.initializeDefaultSearches('anonymous', searches)
    }
  }

  async hasInitializedSearches(): Promise<boolean> {
    if (this.isAuthenticated && this.userId) {
      const data = await this.fetchAPI('/api/searches/saved/initialized')
      return data.initialized || false
    } else {
      return localStorageService.hasInitializedSearches('anonymous')
    }
  }

  async markSearchesInitialized(): Promise<void> {
    if (this.isAuthenticated && this.userId) {
      await this.fetchAPI('/api/searches/saved/mark-initialized', {
        method: 'POST',
      })
    } else {
      await localStorageService.markSearchesInitialized('anonymous')
    }
  }
}

// Factory function to create storage service
export function createClientStorageService(isAuthenticated: boolean, userId: string | null): ClientStorageService {
  return new ClientStorageServiceImpl(isAuthenticated, userId)
}

// Re-export the interface for backward compatibility
export type { ClientStorageService } from './storage.interface'