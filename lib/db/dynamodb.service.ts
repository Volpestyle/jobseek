import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  atomicUpdate,
  withRetry,
  batchWriteItems,
  batchGetItems,
  createTimestamps,
  buildUpdateExpression,
  isValidItem,
} from "./dynamodb-helpers";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  maxAttempts: 3,
  retryMode: "adaptive",
});

const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || "jobseek-users";

// Data type prefixes for single table design
const DATA_TYPES = {
  PROFILE: "PROFILE#MAIN",
  SAVED_JOB: "JOB#",
  SAVED_SEARCH: "SEARCH#",
  APPLICATION: "APPLICATION#",
  JOB_BOARD: "BOARD#",
  PREFERENCES: "PREFERENCES#MAIN",
  RATE_LIMIT: "RATE_LIMIT#",
  JOB_SEARCH_RESULT: "JOB_SEARCH_RESULT#",
  ACTION_LOG: "ACTION_LOG#",
  MASTER_SEARCH: "MASTER_SEARCH#",
} as const;

// User Profile Interface
export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  skills?: string[];
  experience?: WorkExperience[];
  education?: Education[];
  resumeUrl?: string;
  provider?: string; // google, twitter
  subscriptionTier?: "free" | "premium"; // User subscription tier
  subscriptionExpiry?: string; // ISO date string for premium expiry
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  location?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  gpa?: string;
}

// Existing interfaces updated for single table
export interface SavedJob {
  userId: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
  source: string;
  savedAt: string;
  tags?: string[];
  notes?: string;
}

export interface SavedSearch {
  userId: string;
  searchId: string;
  name: string;
  keywords: string;
  location: string;
  jobBoards: string[];
  filters?: {
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string[];
    jobType?: string[];
    remote?: boolean;
    skills?: string[];
    companySize?: string[];
    industry?: string[];
  };
  skills?: string[];
  workPreferences?: {
    remote?: boolean;
    hybrid?: boolean;
    visaSponsor?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  lastRunAt?: string;
  runFrequency?: string;
  isDefault?: boolean;
  isEditable?: boolean;
  nextRunAt?: string;
  notificationChannel?: "email" | "sms" | "push";
  initialized?: boolean;
}

export interface JobApplication {
  userId: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: "applied" | "interviewing" | "offered" | "rejected" | "withdrawn";
  appliedAt: string;
  notes?: string;
  events?: JobApplicationEvent[];
  savedJobId?: string;
}

export interface JobApplicationEvent {
  type: "status_change" | "interview" | "note" | "follow_up" | "offer";
  date: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface JobBoard {
  userId: string;
  boardId: string;
  name: string;
  description?: string;
  jobIds: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  sharedWith?: string[];
}

export interface UserPreferences {
  userId: string;
  savedBoardIds: string[];
  initialized: boolean;
  searchesInitialized?: boolean;
  defaultSearchSettings?: Partial<SavedSearch>;
  notificationSettings?: {
    emailEnabled: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    frequency?: "realtime" | "daily" | "weekly";
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
  postedDate?: string;
}

export interface MasterSearchSession {
  userId: string;
  searchId: string;  // Master search ID
  anonymousId?: string;
  searchParams: {
    keywords: string;
    location: string;
    boards: string[];
  };
  boardSessions: {
    [boardName: string]: {
      sessionId: string;  // Wallcrawler session ID
      status: 'pending' | 'running' | 'completed' | 'error';
      jobCount: number;
      startedAt?: string;
      completedAt?: string;
      error?: string;
    };
  };
  totalJobsFound: number;
  status: 'running' | 'completed' | 'partial' | 'error';
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface JobSearchResult {
  userId: string;
  searchId: string;        // Master search ID (changed from searchSessionId)
  boardName: string;        // Which board these results are from
  sessionId: string;        // Wallcrawler session for this specific board
  anonymousId?: string;     // For anonymous users
  jobs: ExtractedJob[];
  status: "pending" | "running" | "completed" | "error";
  totalJobsFound: number;
  createdAt: string;
  updatedAt: string;
  sessionMetadata?: {
    debugUrl?: string;
    region?: string;
    startedAt?: string;
    endedAt?: string;
  };
  ttl?: number;             // For automatic expiration
}

export class DynamoDBSingleTableService {
  // Batch operations for multiple items
  async batchGetJobsById(
    userId: string,
    jobIds: string[]
  ): Promise<SavedJob[]> {
    if (jobIds.length === 0) return [];

    const keys = jobIds.map((jobId) => ({
      userId,
      dataType: `${DATA_TYPES.SAVED_JOB}${jobId}`,
    }));

    const items = await batchGetItems(docClient, USERS_TABLE, keys);
    return items.filter((item) =>
      isValidItem<SavedJob>(item, ["userId", "jobId"])
    );
  }

  async batchDeleteJobs(userId: string, jobIds: string[]): Promise<void> {
    if (jobIds.length === 0) return;

    const items = jobIds.map((jobId) => ({
      DeleteRequest: {
        Key: {
          userId,
          dataType: `${DATA_TYPES.SAVED_JOB}${jobId}`,
        },
      },
    }));

    await batchWriteItems(docClient, USERS_TABLE, items);
  }
  // User Profile Methods
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: DATA_TYPES.PROFILE,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as UserProfile) || null;
  }

  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const timestamps = createTimestamps(!profile.createdAt);
    const item = {
      ...profile,
      dataType: DATA_TYPES.PROFILE,
      ...timestamps,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });

    await withRetry(() => docClient.send(command));
    return item;
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    return atomicUpdate<UserProfile>(
      docClient,
      USERS_TABLE,
      {
        userId,
        dataType: DATA_TYPES.PROFILE,
      },
      updates
    );
  }

  // Get all user data with parallel queries for better performance
  async getAllUserData(userId: string): Promise<{
    profile: UserProfile | null;
    savedJobs: SavedJob[];
    savedSearches: SavedSearch[];
    applications: JobApplication[];
    jobBoards: JobBoard[];
    preferences: UserPreferences | null;
  }> {
    // Execute all queries in parallel for better performance
    const [
      profile,
      preferences,
      savedJobs,
      savedSearches,
      applications,
      jobBoards,
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserPreferences(userId),
      this.getSavedJobs(userId),
      this.getSavedSearches(userId),
      this.getApplications(userId),
      this.getJobBoards(userId),
    ]);

    return {
      profile,
      preferences,
      savedJobs,
      savedSearches,
      applications,
      jobBoards,
    };
  }

  // Saved Jobs Methods
  async saveJob(job: SavedJob): Promise<SavedJob> {
    const timestamps = createTimestamps();
    const item = {
      ...job,
      dataType: `${DATA_TYPES.SAVED_JOB}${job.jobId}`,
      savedAt: job.savedAt || timestamps.updatedAt,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });
    await withRetry(() => docClient.send(command));
    return item;
  }

  // Batch save multiple jobs
  async batchSaveJobs(jobs: SavedJob[]): Promise<void> {
    const timestamps = createTimestamps();
    const items = jobs.map((job) => ({
      PutRequest: {
        Item: {
          ...job,
          dataType: `${DATA_TYPES.SAVED_JOB}${job.jobId}`,
          savedAt: job.savedAt || timestamps.updatedAt,
        },
      },
    }));

    await batchWriteItems(docClient, USERS_TABLE, items);
  }

  async getSavedJobs(userId: string): Promise<SavedJob[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression:
        "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.SAVED_JOB,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as SavedJob[]) || [];
  }

  async getSavedJob(userId: string, jobId: string): Promise<SavedJob | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_JOB}${jobId}`,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as SavedJob) || null;
  }

  async updateSavedJob(job: SavedJob): Promise<SavedJob> {
    const timestamps = createTimestamps();
    const item = {
      ...job,
      dataType: `${DATA_TYPES.SAVED_JOB}${job.jobId}`,
      updatedAt: timestamps.updatedAt,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });
    await withRetry(() => docClient.send(command));
    return item;
  }

  async deleteSavedJob(userId: string, jobId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_JOB}${jobId}`,
      },
    });
    await docClient.send(command);
  }

  // Saved Searches Methods
  async saveSearch(search: SavedSearch): Promise<SavedSearch> {
    const timestamps = createTimestamps(!search.createdAt);
    const item = {
      ...search,
      dataType: `${DATA_TYPES.SAVED_SEARCH}${search.searchId}`,
      ...timestamps,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });

    await withRetry(() => docClient.send(command));
    return item;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression:
        "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.SAVED_SEARCH,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as SavedSearch[]) || [];
  }

  async getSavedSearch(
    userId: string,
    searchId: string
  ): Promise<SavedSearch | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as SavedSearch) || null;
  }

  async updateSearchLastRun(userId: string, searchId: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`,
      },
      UpdateExpression: "SET lastRunAt = :lastRunAt, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":lastRunAt": new Date().toISOString(),
        ":updatedAt": new Date().toISOString(),
      },
    });
    await docClient.send(command);
  }

  async updateSavedSearch(search: SavedSearch): Promise<SavedSearch> {
    const { userId, searchId, ...updates } = search;
    return atomicUpdate<SavedSearch>(
      docClient,
      USERS_TABLE,
      {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`,
      },
      updates
    );
  }

  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.SAVED_SEARCH}${searchId}`,
      },
    });
    await docClient.send(command);
  }

  // Applications Methods
  async saveApplication(application: JobApplication): Promise<JobApplication> {
    const timestamps = createTimestamps();
    const item = {
      ...application,
      dataType: `${DATA_TYPES.APPLICATION}${application.applicationId}`,
      appliedAt: application.appliedAt || timestamps.updatedAt,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });
    await withRetry(() => docClient.send(command));
    return item;
  }

  async getApplications(userId: string): Promise<JobApplication[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression:
        "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.APPLICATION,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as JobApplication[]) || [];
  }

  async getApplication(
    userId: string,
    applicationId: string
  ): Promise<JobApplication | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.APPLICATION}${applicationId}`,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as JobApplication) || null;
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: JobApplication["status"],
    notes?: string
  ): Promise<void> {
    const updates: Partial<JobApplication> = {
      status,
      ...(notes && { notes }),
    };

    await atomicUpdate<JobApplication>(
      docClient,
      USERS_TABLE,
      {
        userId,
        dataType: `${DATA_TYPES.APPLICATION}${applicationId}`,
      },
      updates
    );
  }

  async updateApplication(
    userId: string,
    applicationId: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    return atomicUpdate<JobApplication>(
      docClient,
      USERS_TABLE,
      {
        userId,
        dataType: `${DATA_TYPES.APPLICATION}${applicationId}`,
      },
      updates,
      {
        conditionExpression: "attribute_exists(userId)",
      }
    );
  }

  // Job Boards Methods
  async createJobBoard(board: JobBoard): Promise<JobBoard> {
    const timestamps = createTimestamps(!board.createdAt);
    const item = {
      ...board,
      dataType: `${DATA_TYPES.JOB_BOARD}${board.boardId}`,
      ...timestamps,
      jobIds: board.jobIds || [],
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });

    await withRetry(() => docClient.send(command));
    return item;
  }

  async getJobBoard(userId: string, boardId: string): Promise<JobBoard | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as JobBoard) || null;
  }

  async getJobBoards(userId: string): Promise<JobBoard[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression:
        "userId = :userId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":prefix": DATA_TYPES.JOB_BOARD,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as JobBoard[]) || [];
  }

  async addJobToBoard(
    userId: string,
    boardId: string,
    jobId: string
  ): Promise<void> {
    const board = await this.getJobBoard(userId, boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (!board.jobIds.includes(jobId)) {
      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: {
          userId,
          dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`,
        },
        UpdateExpression:
          "SET jobIds = list_append(jobIds, :jobId), updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":jobId": [jobId],
          ":updatedAt": new Date().toISOString(),
        },
      });
      await docClient.send(command);
    }
  }

  async removeJobFromBoard(
    userId: string,
    boardId: string,
    jobId: string
  ): Promise<void> {
    const board = await this.getJobBoard(userId, boardId);
    if (!board) return;

    const updatedJobIds = board.jobIds.filter((id) => id !== jobId);

    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`,
      },
      UpdateExpression: "SET jobIds = :jobIds, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":jobIds": updatedJobIds,
        ":updatedAt": new Date().toISOString(),
      },
    });
    await docClient.send(command);
  }

  async deleteJobBoard(userId: string, boardId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_BOARD}${boardId}`,
      },
    });
    await docClient.send(command);
  }

  // Master Search Session Methods
  async createMasterSearch(
    search: MasterSearchSession
  ): Promise<MasterSearchSession> {
    const timestamps = createTimestamps(!search.createdAt);
    const item = {
      ...search,
      dataType: `${DATA_TYPES.MASTER_SEARCH}${search.searchId}`,
      ...timestamps,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });

    await withRetry(() => docClient.send(command));
    return item;
  }

  async getMasterSearch(
    userId: string,
    searchId: string
  ): Promise<MasterSearchSession | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.MASTER_SEARCH}${searchId}`,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as MasterSearchSession) || null;
  }

  async updateBoardSessionStatus(
    userId: string,
    searchId: string,
    boardName: string,
    status: 'pending' | 'running' | 'completed' | 'error',
    jobCount?: number,
    error?: string
  ): Promise<void> {
    const updateExpression = `
      SET boardSessions.#board.#status = :status,
          boardSessions.#board.jobCount = :jobCount,
          updatedAt = :updatedAt
      ${error ? ', boardSessions.#board.#error = :error' : ''}
    `;

    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.MASTER_SEARCH}${searchId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#board': boardName,
        '#status': 'status',
        ...(error && { '#error': 'error' }),
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':jobCount': jobCount || 0,
        ':updatedAt': new Date().toISOString(),
        ...(error && { ':error': error }),
      },
    });

    await withRetry(() => docClient.send(command));
  }

  async updateMasterSearchStatus(
    userId: string,
    searchId: string,
    status: 'running' | 'completed' | 'partial' | 'error'
  ): Promise<void> {
    await atomicUpdate(
      docClient,
      USERS_TABLE,
      {
        userId,
        dataType: `${DATA_TYPES.MASTER_SEARCH}${searchId}`,
      },
      { status, updatedAt: new Date().toISOString() }
    );
  }

  async getMasterSearchesByAnonymousId(
    anonymousId: string
  ): Promise<MasterSearchSession[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: "AnonymousSessionIndex",
      KeyConditionExpression: "anonymousId = :anonymousId",
      ExpressionAttributeValues: {
        ":anonymousId": anonymousId,
      },
    });

    const response = await docClient.send(command);
    return (response.Items || []) as MasterSearchSession[];
  }

  // Job Search Results Methods (Updated)
  async saveJobSearchResults(
    results: JobSearchResult
  ): Promise<JobSearchResult> {
    const timestamps = createTimestamps(!results.createdAt);
    const item = {
      ...results,
      dataType: `${DATA_TYPES.JOB_SEARCH_RESULT}${results.boardName}#${results.sessionId}`,
      ...timestamps,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });

    await withRetry(() => docClient.send(command));
    return item;
  }

  async getJobSearchResultsByBoard(
    userId: string,
    boardName: string,
    sessionId: string
  ): Promise<JobSearchResult | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: `${DATA_TYPES.JOB_SEARCH_RESULT}${boardName}#${sessionId}`,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as JobSearchResult) || null;
  }

  async getSearchResults(searchId: string): Promise<JobSearchResult[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: "SearchIdIndex",
      KeyConditionExpression: "searchId = :searchId",
      ExpressionAttributeValues: {
        ":searchId": searchId,
      },
    });

    const response = await docClient.send(command);
    return (response.Items || []) as JobSearchResult[];
  }

  async getSearchResultsByAnonymousId(
    anonymousId: string
  ): Promise<JobSearchResult[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: "AnonymousSessionIndex",
      KeyConditionExpression: "anonymousId = :anonymousId",
      ExpressionAttributeValues: {
        ":anonymousId": anonymousId,
      },
    });

    const response = await docClient.send(command);
    return (response.Items || []) as JobSearchResult[];
  }

  async updateJobSearchResults(
    userId: string,
    searchId: string,
    updates: Partial<JobSearchResult>
  ): Promise<JobSearchResult> {
    // Need to know boardName and sessionId to update specific result
    // This method needs to be called with more specific info
    const { boardName, sessionId } = updates;
    if (!boardName || !sessionId) {
      throw new Error("boardName and sessionId are required for updating job search results");
    }

    return atomicUpdate<JobSearchResult>(
      docClient,
      USERS_TABLE,
      {
        userId,
        dataType: `${DATA_TYPES.JOB_SEARCH_RESULT}${boardName}#${sessionId}`,
      },
      updates,
      {
        conditionExpression: "attribute_exists(userId)",
      }
    );
  }

  async migrateAnonymousToUser(
    anonymousId: string,
    userId: string
  ): Promise<void> {
    // Get all search results for anonymous user
    const searchResults = await this.getSearchResultsByAnonymousId(anonymousId);
    
    // Update each result to have the new userId and remove anonymousId
    const updatePromises = searchResults.map(result => {
      const newResult = {
        ...result,
        userId,
        anonymousId: undefined,
        ttl: undefined, // Remove TTL for authenticated users
      };
      return this.saveJobSearchResults(newResult);
    });

    await Promise.all(updatePromises);
    
    // Also migrate master searches
    const masterSearches = await this.getMasterSearchesByAnonymousId(anonymousId);
    const masterUpdatePromises = masterSearches.map(search => {
      const newSearch = {
        ...search,
        userId,
        anonymousId: undefined,
        ttl: undefined,
      };
      return this.createMasterSearch(newSearch);
    });

    await Promise.all(masterUpdatePromises);
  }

  async getAllJobSearchResults(userId: string): Promise<JobSearchResult[]> {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression:
        "userId = :userId AND begins_with(dataType, :dataType)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":dataType": DATA_TYPES.JOB_SEARCH_RESULT,
      },
    });

    const response = await docClient.send(command);
    return (response.Items || []) as JobSearchResult[];
  }

  // User Preferences Methods
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        userId,
        dataType: DATA_TYPES.PREFERENCES,
      },
    });
    const response = await docClient.send(command);
    return (response.Item as UserPreferences) || null;
  }

  async saveUserPreferences(
    preferences: UserPreferences
  ): Promise<UserPreferences> {
    const timestamps = createTimestamps(!preferences.createdAt);
    const item = {
      ...preferences,
      dataType: DATA_TYPES.PREFERENCES,
      ...timestamps,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: item,
    });

    await withRetry(() => docClient.send(command));
    return item;
  }

  async initializeUserJobBoards(
    userId: string,
    boardIds: string[]
  ): Promise<void> {
    const preferences = await this.getUserPreferences(userId);

    if (!preferences || !preferences.initialized) {
      await this.saveUserPreferences({
        userId,
        savedBoardIds: boardIds,
        initialized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async isUserInitialized(userId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    return preferences?.initialized || false;
  }

  async getUserSavedBoards(userId: string): Promise<string[]> {
    const preferences = await this.getUserPreferences(userId);
    return preferences?.savedBoardIds || [];
  }

  async saveUserBoardPreference(
    userId: string,
    boardId: string,
    saved: boolean
  ): Promise<void> {
    const preferences = await this.getUserPreferences(userId);
    let savedBoardIds = preferences?.savedBoardIds || [];

    if (saved) {
      if (!savedBoardIds.includes(boardId)) {
        savedBoardIds.push(boardId);
      }
    } else {
      savedBoardIds = savedBoardIds.filter((id) => id !== boardId);
    }

    if (preferences) {
      const command = new UpdateCommand({
        TableName: USERS_TABLE,
        Key: {
          userId,
          dataType: DATA_TYPES.PREFERENCES,
        },
        UpdateExpression:
          "SET savedBoardIds = :boardIds, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":boardIds": savedBoardIds,
          ":updatedAt": new Date().toISOString(),
        },
      });
      await docClient.send(command);
    } else {
      await this.saveUserPreferences({
        userId,
        savedBoardIds,
        initialized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Migration helper - to be removed after migration
  // Action Log Methods
  async saveActionLog(
    sessionId: string,
    log: {
      id: string;
      timestamp: string;
      action: string;
      type:
        | "act"
        | "extract"
        | "observe"
        | "navigate"
        | "scroll"
        | "error"
        | "info"
        | "debug";
      details?: string;
      status: "pending" | "success" | "error";
    }
  ): Promise<void> {
    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        userId: sessionId, // Using sessionId as partition key for action logs
        dataType: `${DATA_TYPES.ACTION_LOG}${log.id}`,
        ...log,
        sessionId,
        createdAt: log.timestamp,
      },
    });
    await docClient.send(command);
  }

  async getActionLogs(sessionId: string): Promise<
    Array<{
      id: string;
      sessionId: string;
      timestamp: string;
      action: string;
      type:
        | "act"
        | "extract"
        | "observe"
        | "navigate"
        | "scroll"
        | "error"
        | "info"
        | "debug";
      details?: string;
      status: "pending" | "success" | "error";
    }>
  > {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression:
        "userId = :sessionId AND begins_with(dataType, :prefix)",
      ExpressionAttributeValues: {
        ":sessionId": sessionId,
        ":prefix": DATA_TYPES.ACTION_LOG,
      },
      ScanIndexForward: true, // Sort by timestamp ascending
    });
    const response = await docClient.send(command);
    return (
      (response.Items as Array<{
        id: string;
        sessionId: string;
        timestamp: string;
        action: string;
        type:
          | "act"
          | "extract"
          | "observe"
          | "navigate"
          | "scroll"
          | "error"
          | "info"
          | "debug";
        details?: string;
        status: "pending" | "success" | "error";
      }>) || []
    );
  }

  async migrateUserData(
    userId: string,
    oldData: {
      savedJobs?: SavedJob[];
      savedSearches?: SavedSearch[];
      applications?: JobApplication[];
      jobBoards?: JobBoard[];
      preferences?: UserPreferences;
    }
  ): Promise<void> {
    const items = [];
    const timestamps = createTimestamps(true);

    if (oldData.savedJobs) {
      for (const job of oldData.savedJobs) {
        items.push({
          PutRequest: {
            Item: {
              ...job,
              dataType: `${DATA_TYPES.SAVED_JOB}${job.jobId}`,
              savedAt: job.savedAt || timestamps.createdAt,
            },
          },
        });
      }
    }

    if (oldData.savedSearches) {
      for (const search of oldData.savedSearches) {
        items.push({
          PutRequest: {
            Item: {
              ...search,
              dataType: `${DATA_TYPES.SAVED_SEARCH}${search.searchId}`,
              ...timestamps,
            },
          },
        });
      }
    }

    if (oldData.applications) {
      for (const app of oldData.applications) {
        items.push({
          PutRequest: {
            Item: {
              ...app,
              dataType: `${DATA_TYPES.APPLICATION}${app.applicationId}`,
              appliedAt: app.appliedAt || timestamps.createdAt,
            },
          },
        });
      }
    }

    if (oldData.jobBoards) {
      for (const board of oldData.jobBoards) {
        items.push({
          PutRequest: {
            Item: {
              ...board,
              dataType: `${DATA_TYPES.JOB_BOARD}${board.boardId}`,
              ...timestamps,
              jobIds: board.jobIds || [],
            },
          },
        });
      }
    }

    if (oldData.preferences) {
      items.push({
        PutRequest: {
          Item: {
            ...oldData.preferences,
            dataType: DATA_TYPES.PREFERENCES,
            ...timestamps,
          },
        },
      });
    }

    // Use batch write for better performance
    if (items.length > 0) {
      await batchWriteItems(docClient, USERS_TABLE, items);
    }
  }
}

export const dynamodbService = new DynamoDBSingleTableService();
