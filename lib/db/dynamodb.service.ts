import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const docClient = DynamoDBDocumentClient.from(client)

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "jobseek-users"

// Data type prefixes for single table design
const DATA_TYPES = {
  PROFILE: "PROFILE#MAIN",
  SAVED_JOB: "JOB#",
  SAVED_SEARCH: "SEARCH#",
  APPLICATION: "APPLICATION#",
  JOB_BOARD: "BOARD#",
  PREFERENCES: "PREFERENCES#MAIN",
  RATE_LIMIT: "RATE_LIMIT#",
  JOB_SEARCH_RESULT: "JOB_SEARCH_RESULT#"
} as const

// User Profile Interface
export interface UserProfile {
  userId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  location?: string
  bio?: string
  avatarUrl?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  skills?: string[]
  experience?: WorkExperience[]
  education?: Education[]
  resumeUrl?: string
  provider?: string // google, twitter
  subscriptionTier?: 'free' | 'premium' // User subscription tier
  subscriptionExpiry?: string // ISO date string for premium expiry
  createdAt: string
  updatedAt: string
}

export interface WorkExperience {
  company: string
  position: string
  startDate: string
  endDate?: string
  current?: boolean
  description?: string
  location?: string
}

export interface Education {
  institution: string
  degree: string
  field?: string
  startDate: string
  endDate?: string
  current?: boolean
  gpa?: string
}

// Existing interfaces updated for single table
export interface SavedJob {
  userId: string
  jobId: string
  title: string
  company: string
  location: string
  salary?: string
  url: string
  description: string
  source: string
  savedAt: string
  tags?: string[]
  notes?: string
}

export interface SavedSearch {
  userId: string
  searchId: string
  name: string
  keywords: string
  location: string
  jobBoards: string[]
  filters?: {
    salaryMin?: number
    salaryMax?: number
    experienceLevel?: string[]
    jobType?: string[]
    remote?: boolean
    skills?: string[]
    companySize?: string[]
    industry?: string[]
  }
  skills?: string[]
  workPreferences?: {
    remote?: boolean
    hybrid?: boolean
    visaSponsor?: boolean
  }
  createdAt: string
  updatedAt: string
  isActive?: boolean
  lastRunAt?: string
  runFrequency?: string
  isDefault?: boolean
  isEditable?: boolean
  remoteOk?: boolean // Backward compatibility
  salaryMin?: number // Backward compatibility
  salaryMax?: number // Backward compatibility
  experienceLevel?: string[] // Backward compatibility
  jobTypes?: string[] // Backward compatibility
  frequency?: 'daily' | 'weekly' | 'realtime' // Backward compatibility
  nextRunAt?: string
  notificationChannel?: 'email' | 'sms' | 'push'
  initialized?: boolean
}

export interface JobApplication {
  userId: string
  applicationId: string
  jobId: string
  jobTitle: string
  company: string
  status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
  appliedAt: string
  notes?: string
  events?: JobApplicationEvent[]
  savedJobId?: string
}

export interface JobApplicationEvent {
  type: 'status_change' | 'interview' | 'note' | 'follow_up' | 'offer'
  date: string
  description: string
  metadata?: Record<string, any>
}

export interface JobBoard {
  userId: string
  boardId: string
  name: string
  description?: string
  jobIds: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
  isPublic: boolean
  sharedWith?: string[]
}

export interface UserPreferences {
  userId: string
  savedBoardIds: string[]
  initialized: boolean
  searchesInitialized?: boolean
  defaultSearchSettings?: Partial<SavedSearch>
  notificationSettings?: {
    emailEnabled: boolean
    smsEnabled?: boolean
    pushEnabled?: boolean
    frequency?: 'realtime' | 'daily' | 'weekly'
  }
  createdAt: string
  updatedAt: string
}

export interface ExtractedJob {
  jobId: string
  title: string
  company: string
  location: string
  salary?: string
  url: string
  description: string
  postedDate?: string
}

export interface JobSearchResult {
  userId: string
  searchSessionId: string
  jobs: ExtractedJob[]
  searchParams: {
    keywords: string
    location: string
    jobBoard: string
  }
  status: 'pending' | 'running' | 'completed' | 'error'
  totalJobsFound: number
  createdAt: string
  updatedAt: string
  sessionMetadata?: {
    debugUrl?: string
    region?: string
    startedAt?: string
    endedAt?: string
  }
}

export class DynamoDBSingleTableService {
  // User Profile Methods
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: DATA_TYPES.PROFILE
      }
    })
    const response = await docClient.send(command)
    return response.Item as UserProfile || null
  }

  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const now = new Date().toISOString()
    const item = {
      ...profile,
      dataType: DATA_TYPES.PROFILE,
      createdAt: profile.createdAt || now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item
    })

    await docClient.send(command)
    return item
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const currentProfile = await this.getUserProfile(userId)
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      userId,
      updatedAt: new Date().toISOString()
    }
    return this.saveUserProfile(updatedProfile as UserProfile)
  }

  // Get all user data in one query
  async getAllUserData(userId: string): Promise<{
    profile: UserProfile | null
    savedJobs: SavedJob[]
    savedSearches: SavedSearch[]
    applications: JobApplication[]
    jobBoards: JobBoard[]
    preferences: UserPreferences | null
  }> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      }
    })

    const response = await docClient.send(command)
    const items = response.Items || []

    const result = {
      profile: null as UserProfile | null,
      savedJobs: [] as SavedJob[],
      savedSearches: [] as SavedSearch[],
      applications: [] as JobApplication[],
      jobBoards: [] as JobBoard[],
      preferences: null as UserPreferences | null
    }

    items.forEach(item => {
      const dataType = item.dataType as string

      if (dataType === DATA_TYPES.PROFILE) {
        result.profile = item as UserProfile
      } else if (dataType === DATA_TYPES.PREFERENCES) {
        result.preferences = item as UserPreferences
      } else if (dataType.startsWith(DATA_TYPES.SAVED_JOB)) {
        result.savedJobs.push(item as SavedJob)
      } else if (dataType.startsWith(DATA_TYPES.SAVED_SEARCH)) {
        result.savedSearches.push(item as SavedSearch)
      } else if (dataType.startsWith(DATA_TYPES.APPLICATION)) {
        result.applications.push(item as JobApplication)
      } else if (dataType.startsWith(DATA_TYPES.JOB_BOARD)) {
        result.jobBoards.push(item as JobBoard)
      }
    })

    return result
  }

  // Saved Jobs Methods
  async saveJob(job: SavedJob): Promise<SavedJob> {
    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        ...job,
        dataType: `${DATA_TYPES.SAVED_JOB}${job.jobId}`,
        savedAt: job.savedAt || new Date().toISOString()
      }
    })
    await docClient.send(command)
    return job
  }

  async getSavedJobs(userId: string): Promise<SavedJob[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.SAVED_JOB
      }
    })
    const response = await docClient.send(command)
    return response.Items as SavedJob[] || []
  }

  async getSavedJob(userId: string, jobId: string): Promise<SavedJob | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_JOB}${jobId}`
      }
    })
    const response = await docClient.send(command)
    return response.Item as SavedJob || null
  }

  async deleteSavedJob(userId: string, jobId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_JOB}${jobId}`
      }
    })
    await docClient.send(command)
  }

  // Saved Searches Methods
  async saveSearch(search: SavedSearch): Promise<SavedSearch> {
    const now = new Date().toISOString()
    const item = {
      ...search,
      dataType: `${DATA_TYPES.SAVED_SEARCH}${search.searchId}`,
      createdAt: search.createdAt || now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item
    })

    await docClient.send(command)
    return item
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.SAVED_SEARCH
      }
    })
    const response = await docClient.send(command)
    return response.Items as SavedSearch[] || []
  }

  async getSavedSearch(userId: string, searchId: string): Promise<SavedSearch | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`
      }
    })
    const response = await docClient.send(command)
    return response.Item as SavedSearch || null
  }

  async updateSearchLastRun(userId: string, searchId: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`
      },
      UpdateExpression: "SET lastRunAt = :lastRunAt, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":lastRunAt": new Date().toISOString(),
        ":updatedAt": new Date().toISOString()
      }
    })
    await docClient.send(command)
  }

  async updateSavedSearch(search: SavedSearch): Promise<SavedSearch> {
    const now = new Date().toISOString()
    const updatedSearch = {
      ...search,
      updatedAt: now
    }
    return this.saveSearch(updatedSearch)
  }

  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`
      }
    })
    await docClient.send(command)
  }

  // Applications Methods
  async saveApplication(application: JobApplication): Promise<JobApplication> {
    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        ...application,
        dataType: `${DATA_TYPES.APPLICATION}${application.applicationId}`,
        appliedAt: application.appliedAt || new Date().toISOString()
      }
    })
    await docClient.send(command)
    return application
  }

  async getApplications(userId: string): Promise<JobApplication[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.APPLICATION
      }
    })
    const response = await docClient.send(command)
    return response.Items as JobApplication[] || []
  }

  async getApplication(userId: string, applicationId: string): Promise<JobApplication | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.APPLICATION}${applicationId}`
      }
    })
    const response = await docClient.send(command)
    return response.Item as JobApplication || null
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: JobApplication["status"],
    notes?: string
  ): Promise<void> {
    const updateExpression = notes
      ? "SET #status = :status, notes = :notes, updatedAt = :updatedAt"
      : "SET #status = :status, updatedAt = :updatedAt"

    const expressionAttributeValues: any = {
      ":status": status,
      ":updatedAt": new Date().toISOString()
    }

    if (notes) {
      expressionAttributeValues[":notes"] = notes
    }

    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.APPLICATION}${applicationId}`
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: expressionAttributeValues
    })

    await docClient.send(command)
  }

  async updateApplication(userId: string, applicationId: string, updates: Partial<JobApplication>): Promise<JobApplication> {
    const getCommand = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.APPLICATION}${applicationId}`
      }
    })

    const currentApp = await docClient.send(getCommand)
    if (!currentApp.Item) {
      throw new Error('Application not found')
    }

    const updatedApp = {
      ...currentApp.Item,
      ...updates,
      userId,
      applicationId
    }

    return this.saveApplication(updatedApp as JobApplication)
  }

  // Job Boards Methods
  async createJobBoard(board: JobBoard): Promise<JobBoard> {
    const now = new Date().toISOString()
    const item = {
      ...board,
      dataType: `${DATA_TYPES.JOB_BOARD}${board.boardId}`,
      createdAt: board.createdAt || now,
      updatedAt: now,
      jobIds: board.jobIds || []
    }

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item
    })

    await docClient.send(command)
    return item
  }

  async getJobBoard(userId: string, boardId: string): Promise<JobBoard | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`
      }
    })
    const response = await docClient.send(command)
    return response.Item as JobBoard || null
  }

  async getJobBoards(userId: string): Promise<JobBoard[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.JOB_BOARD
      }
    })
    const response = await docClient.send(command)
    return response.Items as JobBoard[] || []
  }

  async addJobToBoard(userId: string, boardId: string, jobId: string): Promise<void> {
    const board = await this.getJobBoard(userId, boardId)
    if (!board) {
      throw new Error('Board not found')
    }

    if (!board.jobIds.includes(jobId)) {
      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: {
          userId,
          dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`
        },
        UpdateExpression: "SET jobIds = list_append(jobIds, :jobId), updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":jobId": [jobId],
          ":updatedAt": new Date().toISOString()
        }
      })
      await docClient.send(command)
    }
  }

  async removeJobFromBoard(userId: string, boardId: string, jobId: string): Promise<void> {
    const board = await this.getJobBoard(userId, boardId)
    if (!board) return

    const updatedJobIds = board.jobIds.filter(id => id !== jobId)

    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`
      },
      UpdateExpression: "SET jobIds = :jobIds, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":jobIds": updatedJobIds,
        ":updatedAt": new Date().toISOString()
      }
    })
    await docClient.send(command)
  }

  async deleteJobBoard(userId: string, boardId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`
      }
    })
    await docClient.send(command)
  }

  // Job Search Results Methods
  async saveJobSearchResults(results: JobSearchResult): Promise<JobSearchResult> {
    const now = new Date().toISOString()
    const item = {
      ...results,
      dataType: `${DATA_TYPES.JOB_SEARCH_RESULT}${results.searchSessionId}`,
      createdAt: results.createdAt || now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item
    })

    await docClient.send(command)
    return item
  }

  async getJobSearchResults(userId: string, searchSessionId: string): Promise<JobSearchResult | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_SEARCH_RESULT}${searchSessionId}`
      }
    })
    const response = await docClient.send(command)
    return response.Item as JobSearchResult || null
  }

  async updateJobSearchResults(userId: string, searchSessionId: string, updates: Partial<JobSearchResult>): Promise<JobSearchResult> {
    const currentResults = await this.getJobSearchResults(userId, searchSessionId)
    if (!currentResults) {
      throw new Error('Job search results not found')
    }

    const updatedResults = {
      ...currentResults,
      ...updates,
      userId,
      searchSessionId,
      updatedAt: new Date().toISOString()
    }

    return this.saveJobSearchResults(updatedResults)
  }

  async getAllJobSearchResults(userId: string): Promise<JobSearchResult[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId AND begins_with(dataType, :dataType)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":dataType": DATA_TYPES.JOB_SEARCH_RESULT
      }
    })

    const response = await docClient.send(command)
    return (response.Items || []) as JobSearchResult[]
  }

  // User Preferences Methods
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: DATA_TYPES.PREFERENCES
      }
    })
    const response = await docClient.send(command)
    return response.Item as UserPreferences || null
  }

  async saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const now = new Date().toISOString()
    const item = {
      ...preferences,
      dataType: DATA_TYPES.PREFERENCES,
      createdAt: preferences.createdAt || now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item
    })

    await docClient.send(command)
    return item
  }

  async initializeUserJobBoards(userId: string, boardIds: string[]): Promise<void> {
    const preferences = await this.getUserPreferences(userId)

    if (!preferences || !preferences.initialized) {
      await this.saveUserPreferences({
        userId,
        savedBoardIds: boardIds,
        initialized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  async isUserInitialized(userId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId)
    return preferences?.initialized || false
  }

  async getUserSavedBoards(userId: string): Promise<string[]> {
    const preferences = await this.getUserPreferences(userId)
    return preferences?.savedBoardIds || []
  }

  async saveUserBoardPreference(userId: string, boardId: string, saved: boolean): Promise<void> {
    const preferences = await this.getUserPreferences(userId)
    let savedBoardIds = preferences?.savedBoardIds || []

    if (saved) {
      if (!savedBoardIds.includes(boardId)) {
        savedBoardIds.push(boardId)
      }
    } else {
      savedBoardIds = savedBoardIds.filter(id => id !== boardId)
    }

    if (preferences) {
      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: {
          userId,
          dataType: DATA_TYPES.PREFERENCES
        },
        UpdateExpression: "SET savedBoardIds = :boardIds, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":boardIds": savedBoardIds,
          ":updatedAt": new Date().toISOString()
        }
      })
      await docClient.send(command)
    } else {
      await this.saveUserPreferences({
        userId,
        savedBoardIds,
        initialized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  async initializeDefaultSearches(userId: string, searches: Omit<SavedSearch, 'userId'>[]): Promise<void> {
    const existingSearches = await this.getSavedSearches(userId)

    if (existingSearches.length === 0) {
      const promises = searches.map(search =>
        this.saveSearch({
          ...search,
          userId,
        } as SavedSearch)
      )

      await Promise.all(promises)
    }
  }

  async hasInitializedSearches(userId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId)
    return preferences?.searchesInitialized || false
  }

  async markSearchesInitialized(userId: string): Promise<void> {
    const preferences = await this.getUserPreferences(userId)

    if (preferences) {
      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: {
          userId,
          dataType: DATA_TYPES.PREFERENCES
        },
        UpdateExpression: "SET searchesInitialized = :searchesInitialized, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":searchesInitialized": true,
          ":updatedAt": new Date().toISOString()
        }
      })
      await docClient.send(command)
    } else {
      await this.saveUserPreferences({
        userId,
        savedBoardIds: [],
        initialized: false,
        searchesInitialized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  // Migration helper - to be removed after migration
  async migrateUserData(userId: string, oldData: {
    savedJobs?: SavedJob[]
    savedSearches?: SavedSearch[]
    applications?: JobApplication[]
    jobBoards?: JobBoard[]
    preferences?: UserPreferences
  }): Promise<void> {
    const operations = []

    if (oldData.savedJobs) {
      for (const job of oldData.savedJobs) {
        operations.push(this.saveJob(job))
      }
    }

    if (oldData.savedSearches) {
      for (const search of oldData.savedSearches) {
        operations.push(this.saveSearch(search))
      }
    }

    if (oldData.applications) {
      for (const app of oldData.applications) {
        operations.push(this.saveApplication(app))
      }
    }

    if (oldData.jobBoards) {
      for (const board of oldData.jobBoards) {
        operations.push(this.createJobBoard(board))
      }
    }

    if (oldData.preferences) {
      operations.push(this.saveUserPreferences(oldData.preferences))
    }

    await Promise.all(operations)
  }
}

export const dynamodbService = new DynamoDBSingleTableService()