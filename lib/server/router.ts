import { Hono } from "hono";
import { requireAuthOrAnonymous, requireAuthenticated, getAuth } from "@/lib/server/auth";
import { checkSearchRateLimit, checkApplyRateLimit } from "@/lib/auth/rate-limiter";
import { wallcrawlerService } from "@/lib/wallcrawler.server";
import { dynamodbService } from "@/lib/db/dynamodb.service";
import { createWallcrawlerClient } from "@/lib/wallcrawler-client";
import { streamSSE } from "hono/streaming";
import { s3Service } from "@/lib/storage/s3.service";
import { storageService } from "@/lib/storage/storage.service";
import { actionLogEmitter } from "@/lib/events/action-logs";
import { Stagehand } from "@wallcrawler/stagehand";
import type { MigrationData } from "@/lib/migration/migration.service";

export const api = new Hono();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+\-()]+$/;

api.use("/wallcrawler/*", async (c, next) => {
  const rateLimit = await checkSearchRateLimit(c.req.raw);
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(
      0,
      Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    );
    c.header("Retry-After", retryAfter.toString());
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  await next();
});

api.post("/wallcrawler/search/start", requireAuthOrAnonymous(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const body = await c.req.json();
  const { keywords, location, boards, saveSearch, searchName } = body;

  if (!keywords || !boards || boards.length === 0) {
    return c.json(
      { error: "Missing required fields: keywords and boards are required" },
      400
    );
  }

  const masterSearchId = `search_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const anonymousId = auth.isAnonymous ? auth.userId.replace("anon_", "") : undefined;

  const masterSearch = {
    userId: auth.userId,
    searchId: masterSearchId,
    anonymousId,
    searchParams: { keywords, location: location || "", boards },
    boardSessions: boards.reduce(
      (acc: Record<string, { sessionId: string; status: string; jobCount: number }>, board: string) => {
        acc[board] = { sessionId: "", status: "pending", jobCount: 0 };
        return acc;
      },
      {}
    ),
    totalJobsFound: 0,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ttl: auth.isAnonymous ? Math.floor(Date.now() / 1000) + 24 * 60 * 60 : undefined,
  };

  await dynamodbService.createMasterSearch(masterSearch);

  if (auth.isAuthenticated && saveSearch && searchName) {
    await dynamodbService.saveSearch({
      userId: auth.userId,
      searchId: `saved_${Date.now()}`,
      name: searchName,
      keywords,
      location: location || "",
      jobBoards: boards,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    });
  } else if (!auth.isAuthenticated && saveSearch) {
    return c.json(
      {
        error: "Anonymous users cannot save searches. Please sign in to save searches.",
      },
      403
    );
  }

  const boardPromises = boards.map(async (board: string) => {
    try {
      await wallcrawlerService.runJobSearchAsync({
        keywords,
        location: location || "",
        jobBoard: board,
        userMetadata: {
          userId: auth.userId,
          anonymousId,
          isAnonymous: auth.isAnonymous,
          masterSearchId,
          boardName: board,
        },
      });

      await dynamodbService.updateBoardSessionStatus(
        auth.userId,
        masterSearchId,
        board,
        "running",
        0
      );
    } catch (error) {
      console.error(`Failed to search ${board}:`, error);
      await dynamodbService.updateBoardSessionStatus(
        auth.userId,
        masterSearchId,
        board,
        "error",
        0,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  });

  Promise.all(boardPromises)
    .then(async () => {
      const sessions = await dynamodbService.getMasterSearch(auth.userId, masterSearchId);
      if (!sessions) return;

      const boardStates = Object.values(sessions.boardSessions);
      const successfulBoards = boardStates.filter((s) => s.status === "completed").length;

      const status =
        successfulBoards === 0
          ? "error"
          : successfulBoards === boards.length
          ? "completed"
          : "partial";

      await dynamodbService.updateMasterSearchStatus(auth.userId, masterSearchId, status);
    })
    .catch(console.error);

  return c.json({
    searchId: masterSearchId,
    message: `Starting search on ${boards.length} job board${boards.length > 1 ? "s" : ""}`,
    boards: masterSearch.boardSessions,
  });
});

api.get("/jobs/search-results", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const results = await dynamodbService.getAllJobSearchResults(auth.userId);
  return c.json({ results });
});

api.get(
  "/jobs/search-results/:searchSessionId",
  requireAuthenticated(),
  async (c) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const searchSessionId = c.req.param("searchSessionId");
      const results = await dynamodbService.getSearchResults(searchSessionId);
      const result = results.length > 0 ? results[0] : null;

      if (!result) {
        return c.json({ error: "Job search results not found" }, 404);
      }

      return c.json({ result });
    } catch (error) {
      console.error("Failed to fetch job search result:", error);
      return c.json({ error: "Failed to fetch job search result" }, 500);
    }
  }
);

api.get("/jobs/saved", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const savedJobs = await dynamodbService.getSavedJobs(auth.userId);
    return c.json({ jobs: savedJobs });
  } catch (error) {
    console.error("Failed to get saved jobs:", error);
    return c.json({ error: "Failed to get saved jobs" }, 500);
  }
});

api.post("/jobs/saved", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const {
      jobId,
      title,
      company,
      location,
      salary,
      url,
      description,
      source,
      tags,
      notes,
    } = body ?? {};

    if (
      !jobId ||
      !title ||
      !company ||
      !location ||
      !url ||
      !description ||
      !source
    ) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const savedJob = await dynamodbService.saveJob({
      userId: auth.userId,
      jobId,
      title,
      company,
      location,
      salary,
      url,
      description,
      source,
      savedAt: new Date().toISOString(),
      tags,
      notes,
    });

    return c.json({ job: savedJob });
  } catch (error) {
    console.error("Failed to save job:", error);
    return c.json({ error: "Failed to save job" }, 500);
  }
});

api.get("/jobs/saved/:jobId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const jobId = c.req.param("jobId");
    const job = await dynamodbService.getSavedJob(auth.userId, jobId);

    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }

    return c.json({ job });
  } catch (error) {
    console.error("Failed to get saved job:", error);
    return c.json({ error: "Failed to get saved job" }, 500);
  }
});

api.put("/jobs/saved/:jobId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const jobId = c.req.param("jobId");
    const body = await c.req.json();
    const { tags, notes } = body ?? {};

    const existingJob = await dynamodbService.getSavedJob(auth.userId, jobId);

    if (!existingJob) {
      return c.json({ error: "Job not found" }, 404);
    }

    const updatedJob = await dynamodbService.updateSavedJob({
      ...existingJob,
      tags: tags !== undefined ? tags : existingJob.tags,
      notes: notes !== undefined ? notes : existingJob.notes,
    });

    return c.json({ job: updatedJob });
  } catch (error) {
    console.error("Failed to update saved job:", error);
    return c.json({ error: "Failed to update saved job" }, 500);
  }
});

api.delete("/jobs/saved/:jobId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const jobId = c.req.param("jobId");
    await dynamodbService.deleteSavedJob(auth.userId, jobId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete saved job:", error);
    return c.json({ error: "Failed to delete saved job" }, 500);
  }
});

api.get("/user/searches/saved", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const savedSearches = await dynamodbService.getSavedSearches(auth.userId);
    return c.json({ searches: savedSearches });
  } catch (error) {
    console.error("Failed to get saved searches:", error);
    return c.json({ error: "Failed to get saved searches" }, 500);
  }
});

api.post("/user/searches/saved", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const {
      name,
      keywords,
      location,
      jobBoards,
      filters,
      runFrequency,
      skills,
      workPreferences,
    } = body ?? {};

    if (!name || !keywords) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const savedSearch = await dynamodbService.saveSearch({
      userId: auth.userId,
      searchId: `search_${Date.now()}`,
      name,
      keywords,
      location: typeof location === "string" ? location : "",
      jobBoards: Array.isArray(jobBoards)
        ? jobBoards.filter((board: unknown): board is string =>
            typeof board === "string" && board.length > 0
          )
        : [],
      filters,
      skills,
      workPreferences,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      runFrequency,
    });

    return c.json({ search: savedSearch });
  } catch (error) {
    console.error("Failed to save search:", error);
    return c.json({ error: "Failed to save search" }, 500);
  }
});

api.get("/user/searches/saved/:searchId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const searchId = c.req.param("searchId");
    const search = await dynamodbService.getSavedSearch(auth.userId, searchId);

    if (!search) {
      return c.json({ error: "Search not found" }, 404);
    }

    return c.json({ search });
  } catch (error) {
    console.error("Failed to get saved search:", error);
    return c.json({ error: "Failed to get saved search" }, 500);
  }
});

api.put("/user/searches/saved/:searchId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const searchId = c.req.param("searchId");
    const body = await c.req.json();
    const {
      name,
      keywords,
      location,
      jobBoards,
      filters,
      runFrequency,
      isActive,
      isEditable,
      skills,
      workPreferences,
    } = body ?? {};

    if (!name || !keywords) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const existingSearch = await dynamodbService.getSavedSearch(
      auth.userId,
      searchId
    );

    if (!existingSearch) {
      return c.json({ error: "Search not found" }, 404);
    }

    if (existingSearch.isEditable === false) {
      return c.json({ error: "This search cannot be edited" }, 403);
    }

    const updatedSearch = await dynamodbService.updateSavedSearch({
      ...existingSearch,
      name,
      keywords,
      location: typeof location === "string" ? location : "",
      jobBoards: Array.isArray(jobBoards)
        ? jobBoards.filter((board: unknown): board is string =>
            typeof board === "string" && board.length > 0
          )
        : [],
      filters,
      skills,
      workPreferences,
      runFrequency,
      isActive: isActive !== undefined ? isActive : existingSearch.isActive,
      isEditable:
        isEditable !== undefined ? isEditable : existingSearch.isEditable,
    });

    return c.json({ search: updatedSearch });
  } catch (error) {
    console.error("Failed to update saved search:", error);
    return c.json({ error: "Failed to update saved search" }, 500);
  }
});

api.put(
  "/user/searches/saved/:searchId/last-run",
  requireAuthenticated(),
  async (c) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const searchId = c.req.param("searchId");
      await dynamodbService.updateSearchLastRun(auth.userId, searchId);
      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to update search last run:", error);
      return c.json({ error: "Failed to update search" }, 500);
    }
  }
);

api.delete("/user/searches/saved/:searchId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const searchId = c.req.param("searchId");
    await dynamodbService.deleteSavedSearch(auth.userId, searchId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete saved search:", error);
    return c.json({ error: "Failed to delete saved search" }, 500);
  }
});

api.post("/resume/upload", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const { filename, contentType } = body ?? {};

    if (!filename || !contentType) {
      return c.json({ error: "Filename and content type required" }, 400);
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(contentType)) {
      return c.json(
        { error: "Invalid file type. Only PDF and Word documents are allowed" },
        400
      );
    }

    const { uploadUrl, s3Key } = await s3Service.getUploadUrl(
      auth.userId,
      filename,
      contentType
    );

    return c.json({ uploadUrl, s3Key });
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    return c.json({ error: "Failed to generate upload URL" }, 500);
  }
});

api.get("/resume/upload", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const resumes = await s3Service.listUserResumes(auth.userId);
    return c.json({ resumes });
  } catch (error) {
    console.error("Failed to list resumes:", error);
    return c.json({ error: "Failed to list resumes" }, 500);
  }
});

api.delete("/resume/upload", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const s3Key = c.req.query("s3Key");
    if (!s3Key) {
      return c.json({ error: "S3 key required" }, 400);
    }

    if (!s3Key.includes(`resumes/${auth.userId}/`)) {
      return c.json({ error: "Unauthorized to delete this resume" }, 403);
    }

    await s3Service.deleteResume(s3Key);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete resume:", error);
    return c.json({ error: "Failed to delete resume" }, 500);
  }
});

api.get("/user/board-preferences", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const savedBoardIds = await dynamodbService.getUserSavedBoards(auth.userId);
    return c.json({ savedBoardIds });
  } catch (error) {
    console.error("Failed to get user board preferences:", error);
    return c.json({ error: "Failed to get board preferences" }, 500);
  }
});

api.get("/user/board-preferences/status", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const initialized = await dynamodbService.isUserInitialized(auth.userId);
    return c.json({ initialized });
  } catch (error) {
    console.error("Failed to get user initialization status:", error);
    return c.json({ error: "Failed to get initialization status" }, 500);
  }
});

api.post("/user/board-preferences/initialize", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const { boardIds } = body ?? {};

    if (!boardIds || !Array.isArray(boardIds)) {
      return c.json({ error: "Board IDs array required" }, 400);
    }

    await dynamodbService.initializeUserJobBoards(auth.userId, boardIds);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to initialize user board preferences:", error);
    return c.json({ error: "Failed to initialize board preferences" }, 500);
  }
});

api.put("/user/board-preferences/:boardId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const boardId = c.req.param("boardId");
    const body = await c.req.json();
    const { saved } = body ?? {};

    if (typeof saved !== "boolean") {
      return c.json({ error: "Saved boolean value required" }, 400);
    }

    await dynamodbService.saveUserBoardPreference(auth.userId, boardId, saved);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to save user board preference:", error);
    return c.json({ error: "Failed to save board preference" }, 500);
  }
});

api.get("/user/profile", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const storage = await storageService.getStorageForUser(auth.userId);
    if (!storage || !storage.getUserProfile) {
      return c.json({ error: "Storage not available" }, 500);
    }

    const profile = await storage.getUserProfile(auth.userId);

    if (!profile) {
      return c.json({
        userId: auth.userId,
        email: auth.email || "",
        firstName: "",
        lastName: "",
        avatarUrl: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return c.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

api.put("/user/profile", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const updates = await c.req.json();

    if (updates) {
      delete updates.userId;
      delete updates.createdAt;
      delete updates.provider;
    }

    if (updates?.email && !EMAIL_REGEX.test(updates.email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    if (updates?.phone && (!PHONE_REGEX.test(updates.phone) || updates.phone.length < 10)) {
      return c.json({ error: "Invalid phone format" }, 400);
    }

    const storage = await storageService.getStorageForUser(auth.userId);
    if (
      !storage ||
      !storage.getUserProfile ||
      !storage.updateUserProfile ||
      !storage.saveUserProfile
    ) {
      return c.json({ error: "Storage not available" }, 500);
    }

    const existingProfile = await storage.getUserProfile(auth.userId);

    const profile = existingProfile
      ? await storage.updateUserProfile(auth.userId, updates)
      : await storage.saveUserProfile({
          userId: auth.userId,
          email: auth.email || updates?.email || "",
          firstName: updates?.firstName || "",
          lastName: updates?.lastName || "",
          avatarUrl: updates?.avatarUrl || "",
          ...updates,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

    return c.json(profile);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

api.get("/boards", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const boards = await dynamodbService.getJobBoards(auth.userId);
    return c.json({ boards });
  } catch (error) {
    console.error("Failed to get job boards:", error);
    return c.json({ error: "Failed to get job boards" }, 500);
  }
});

api.get("/boards/:boardId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const boardId = c.req.param("boardId");
    const board = await dynamodbService.getJobBoard(auth.userId, boardId);
    if (!board) {
      return c.json({ error: "Board not found" }, 404);
    }
    return c.json({ board });
  } catch (error) {
    console.error("Failed to get job board:", error);
    return c.json({ error: "Failed to get job board" }, 500);
  }
});

api.post("/boards", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, isPublic } = body ?? {};

    if (!name) {
      return c.json({ error: "Board name required" }, 400);
    }

    const board = await dynamodbService.createJobBoard({
      userId: auth.userId,
      boardId: `board_${Date.now()}`,
      name,
      description,
      jobIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: isPublic || false,
    });

    return c.json({ board });
  } catch (error) {
    console.error("Failed to create job board:", error);
    return c.json({ error: "Failed to create job board" }, 500);
  }
});

api.post("/boards/:boardId/jobs", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const boardId = c.req.param("boardId");
    const { jobId } = (await c.req.json()) ?? {};

    if (!jobId) {
      return c.json({ error: "Job ID required" }, 400);
    }

    await dynamodbService.addJobToBoard(auth.userId, boardId, jobId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to add job to board:", error);
    return c.json({ error: "Failed to add job to board" }, 500);
  }
});

api.delete(
  "/boards/:boardId/jobs/:jobId",
  requireAuthenticated(),
  async (c) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const boardId = c.req.param("boardId");
      const jobId = c.req.param("jobId");
      await dynamodbService.removeJobFromBoard(auth.userId, boardId, jobId);
      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to remove job from board:", error);
      return c.json({ error: "Failed to remove job from board" }, 500);
    }
  }
);

api.delete("/boards/:boardId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const boardId = c.req.param("boardId");
    await dynamodbService.deleteJobBoard(auth.userId, boardId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job board:", error);
    return c.json({ error: "Failed to delete job board" }, 500);
  }
});

api.post("/applications", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await c.req.json();
    const application = await dynamodbService.saveApplication({
      ...data,
      userId: auth.userId,
      applicationId:
        data?.applicationId || `app_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      appliedAt: data?.appliedAt || new Date().toISOString(),
    });

    return c.json({ application });
  } catch (error) {
    console.error("Failed to save application:", error);
    return c.json({ error: "Failed to save application" }, 500);
  }
});

api.get("/applications", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const applications = await dynamodbService.getApplications(auth.userId);
    return c.json({ applications });
  } catch (error) {
    console.error("Failed to get applications:", error);
    return c.json({ error: "Failed to get applications" }, 500);
  }
});

api.get("/applications/:applicationId", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const applicationId = c.req.param("applicationId");
    const application = await dynamodbService.getApplication(
      auth.userId,
      applicationId
    );

    if (!application) {
      return c.json({ error: "Application not found" }, 404);
    }

    return c.json({ application });
  } catch (error) {
    console.error("Failed to get application:", error);
    return c.json({ error: "Failed to get application" }, 500);
  }
});

api.put(
  "/applications/:applicationId/status",
  requireAuthenticated(),
  async (c) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const applicationId = c.req.param("applicationId");
      const { status, notes } = (await c.req.json()) ?? {};

      if (!status) {
        return c.json({ error: "Status required" }, 400);
      }

      await dynamodbService.updateApplicationStatus(
        auth.userId,
        applicationId,
        status,
        notes
      );

      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to update application status:", error);
      return c.json({ error: "Failed to update application" }, 500);
    }
  }
);

api.post("/auth/migrate", requireAuthenticated(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = (await c.req.json()) as {
      userId: string;
      data: MigrationData;
      version: string;
    };

    if (!body?.data) {
      return c.json(
        {
          success: false,
          error: "Invalid migration request",
          message: "Migration data is required",
        },
        400
      );
    }

    const { data } = body;
    const migrationResult = {
      savedJobs: 0,
      savedSearches: 0,
      applications: 0,
      jobBoards: 0,
      searchResults: 0,
      profile: false,
    };

    const errors: string[] = [];

    if (data.savedJobs?.length) {
      const results = await Promise.allSettled(
        data.savedJobs.map(async (job) => {
          try {
            await dynamodbService.saveJob({
              ...job,
              userId: auth.userId,
              savedAt: job.savedAt || new Date().toISOString(),
            });
            return true;
          } catch (err) {
            errors.push(
              `Job ${job.jobId}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
            return false;
          }
        })
      );
      migrationResult.savedJobs = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
    }

    if (data.savedSearches?.length) {
      const results = await Promise.allSettled(
        data.savedSearches.map(async (search) => {
          try {
            await dynamodbService.saveSearch({
              ...search,
              userId: auth.userId,
              searchId:
                search.searchId ||
                `search_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              createdAt: search.createdAt || new Date().toISOString(),
              updatedAt: search.updatedAt || new Date().toISOString(),
            });
            return true;
          } catch (err) {
            errors.push(
              `Search ${search.searchId}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
            return false;
          }
        })
      );
      migrationResult.savedSearches = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
    }

    if (data.applications?.length) {
      const results = await Promise.allSettled(
        data.applications.map(async (application) => {
          try {
            await dynamodbService.saveApplication({
              ...application,
              userId: auth.userId,
              applicationId:
                application.applicationId ||
                `app_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              appliedAt: application.appliedAt || new Date().toISOString(),
            });
            return true;
          } catch (err) {
            errors.push(
              `Application ${application.applicationId}: ${
                err instanceof Error ? err.message : "Unknown error"
              }`
            );
            return false;
          }
        })
      );
      migrationResult.applications = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
    }

    if (data.jobBoards?.length) {
      const results = await Promise.allSettled(
        data.jobBoards.map(async (board) => {
          try {
            await dynamodbService.createJobBoard({
              ...board,
              userId: auth.userId,
              boardId:
                board.boardId ||
                `board_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              createdAt: board.createdAt || new Date().toISOString(),
              updatedAt: board.updatedAt || new Date().toISOString(),
            });
            return true;
          } catch (err) {
            errors.push(
              `Board ${board.boardId}: ${err instanceof Error ? err.message : "Unknown error"}`
            );
            return false;
          }
        })
      );
      migrationResult.jobBoards = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
    }

    if (data.boardPreferences?.length) {
      try {
        await dynamodbService.initializeUserJobBoards(
          auth.userId,
          data.boardPreferences
        );
      } catch (err) {
        errors.push(
          `Board preferences: ${err instanceof Error ? err.message : "Failed to migrate"}`
        );
      }
    }

    if (data.searchResults?.length) {
      const results = await Promise.allSettled(
        data.searchResults.map(async (result) => {
          try {
            await dynamodbService.saveJobSearchResults({
              ...result,
              userId: auth.userId,
              updatedAt: result.updatedAt || new Date().toISOString(),
              ttl: undefined,
            });
            return true;
          } catch (err) {
            errors.push("Search result: Failed to migrate");
            return false;
          }
        })
      );
      migrationResult.searchResults = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
    }

    if (data.profile) {
      try {
        await dynamodbService.saveUserProfile({
          ...data.profile,
          userId: auth.userId,
          createdAt: data.profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        migrationResult.profile = true;
      } catch (err) {
        errors.push(
          `Profile: ${err instanceof Error ? err.message : "Failed to migrate"}`
        );
      }
    }

    if (data.anonymousId) {
      try {
        const searchResults =
          await dynamodbService.getSearchResultsByAnonymousId(
            data.anonymousId
          );

        if (searchResults.length > 0) {
          const masterSearches =
            await dynamodbService.getMasterSearchesByAnonymousId(
              data.anonymousId
            );

          for (const search of masterSearches) {
            try {
              await dynamodbService.createMasterSearch({
                ...search,
                userId: auth.userId,
                anonymousId: undefined,
                ttl: undefined,
              });
            } catch (err) {
              console.error(
                `Failed to migrate master search ${search.searchId}:`,
                err
              );
            }
          }

          for (const result of searchResults) {
            const alreadyMigrated = data.searchResults?.some(
              (r) => r.searchId === result.searchId
            );

            if (!alreadyMigrated) {
              try {
                await dynamodbService.saveJobSearchResults({
                  ...result,
                  userId: auth.userId,
                  anonymousId: undefined,
                  ttl: undefined,
                });
                migrationResult.searchResults++;
              } catch (err) {
                console.error("Failed to migrate search result:", err);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to migrate anonymous session data:", error);
        errors.push("Some anonymous session data could not be migrated");
      }
    }

    return c.json({
      success: errors.length === 0,
      migrated: migrationResult,
      errors,
      message:
        errors.length === 0
          ? "Migration completed successfully"
          : `Migration completed with ${errors.length} error(s)`,
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return c.json(
      {
        success: false,
        error: "Migration failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      500
    );
  }
});

api.get("/wallcrawler/search", requireAuthOrAnonymous(), async (c) => {
  try {
    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json(
        { error: "Missing required parameter: sessionId" },
        400
      );
    }

    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const wallcrawler = createWallcrawlerClient();
    const session = await wallcrawler.sessions.retrieve(sessionId);
    const sessionUserId = session.userMetadata?.userId;

    if (sessionUserId !== auth.userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const debugInfo = await wallcrawler.sessions.debug(sessionId);

    return c.json({
      sessionId: session.id,
      status: session.status,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      debugUrl: debugInfo.debuggerUrl,
      debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
      connectUrl: session.connectUrl,
      userMetadata: session.userMetadata,
      keywords: session.userMetadata?.keywords || "",
      location: session.userMetadata?.location || "",
      jobBoard: session.userMetadata?.jobBoard || "",
    });
  } catch (error) {
    console.error("Failed to retrieve session:", error);
    return c.json({ error: "Failed to retrieve session" }, 500);
  }
});

api.post("/wallcrawler/search/stream", requireAuthenticated(), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.keywords || !body.location || !body.jobBoard) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return streamSSE(
    c,
    async (stream) => {
      try {
        await wallcrawlerService.runJobSearchWithStream(
          {
            keywords: body.keywords,
            location: body.location,
            jobBoard: body.jobBoard,
            userMetadata: {
              userId: auth.userId,
              isAnonymous: auth.isAnonymous,
            },
          },
          async (event) => {
            await stream.writeSSE({ data: JSON.stringify(event) });
            if (event.type === "complete" || event.type === "error") {
              await stream.close();
            }
          }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to start search";
        await stream.writeSSE({
          data: JSON.stringify({ type: "error", error: message }),
        });
        await stream.close();
      }
    },
    {
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
});

api.get("/wallcrawler/search/sessions", requireAuthOrAnonymous(), async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sessions = await dynamodbService.getMasterSearchesByUserId(auth.userId);
    sessions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({
      sessions,
      userId: auth.userId,
      isAnonymous: auth.isAnonymous,
    });
  } catch (error) {
    console.error("Failed to fetch master search sessions:", error);
    return c.json({ error: "Failed to fetch search sessions" }, 500);
  }
});

api.get(
  "/wallcrawler/search/:searchId/stream",
  requireAuthOrAnonymous(),
  async (c) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const searchId = c.req.param("searchId");

    return streamSSE(
      c,
      async (stream) => {
        const send = async (type: string, data: unknown) => {
          await stream.writeSSE({ data: JSON.stringify({ type, data }) });
        };

        try {
          const masterSearch = await dynamodbService.getMasterSearch(
            auth.userId,
            searchId
          );

          if (!masterSearch) {
            await send("error", { message: "Search not found" });
            await stream.close();
            return;
          }

          if (masterSearch.userId !== auth.userId) {
            await send("error", { message: "Unauthorized" });
            await stream.close();
            return;
          }

          await send("search", {
            searchId: masterSearch.searchId,
            searchParams: masterSearch.searchParams,
            boardSessions: masterSearch.boardSessions,
            totalJobsFound: masterSearch.totalJobsFound,
            status: masterSearch.status,
            createdAt: masterSearch.createdAt,
            updatedAt: masterSearch.updatedAt,
          });

          const allResults = await dynamodbService.getSearchResults(searchId);
          for (const boardResult of allResults) {
            await send("board-jobs", {
              board: boardResult.boardName,
              jobs: boardResult.jobs,
              status: boardResult.status,
              totalJobsFound: boardResult.totalJobsFound,
            });
          }

          const unsubscribes: Array<() => void> = [];

          Object.entries(masterSearch.boardSessions).forEach(
            ([boardName, session]) => {
              if (session.sessionId) {
                const unsub = actionLogEmitter.subscribeToSession(
                  session.sessionId,
                  {
                    onJobs: (jobs) =>
                      send("board-jobs-update", {
                        board: boardName,
                        jobs,
                        sessionId: session.sessionId,
                      }),
                    onLog: (log) =>
                      send("board-log", {
                        board: boardName,
                        log,
                        sessionId: session.sessionId,
                      }),
                    onTotalJobs: (totalJobs) =>
                      send("board-total-update", {
                        board: boardName,
                        totalJobs,
                        sessionId: session.sessionId,
                      }),
                  }
                );
                unsubscribes.push(unsub);
              }
            }
          );

          const heartbeat = setInterval(async () => {
            try {
              await stream.writeSSE({ event: "heartbeat", data: "" });
            } catch {
              clearInterval(heartbeat);
              unsubscribes.forEach((unsub) => unsub());
            }
          }, 30000);

          stream.onAbort(() => {
            clearInterval(heartbeat);
            unsubscribes.forEach((unsub) => unsub());
          });
        } catch (error) {
          console.error("Stream error:", error);
          await send("error", {
            message:
              error instanceof Error ? error.message : "Internal server error",
          });
          await stream.close();
        }
      },
      {
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
);

api.post("/wallcrawler/apply", requireAuthOrAnonymous(), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const rateLimit = await checkApplyRateLimit(c.req.raw);
    if (!rateLimit.allowed) {
      return c.json(
        {
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        429
      );
    }

    const body = await c.req.json();
    const { jobUrl, jobDetails, resumeS3Key, sessionId } = body ?? {};

    if (!jobUrl || !jobDetails) {
      return c.json(
        { error: "Missing required fields: jobUrl and jobDetails are required" },
        400
      );
    }

    if (auth.isAuthenticated) {
      let stagehand: Stagehand | null = null;

      try {
        if (sessionId) {
          const wallcrawler = createWallcrawlerClient();
          await wallcrawler.sessions.retrieve(sessionId);

          stagehand = new Stagehand({
            env: "WALLCRAWLER",
            apiKey: process.env.WALLCRAWLER_API_KEY,
            projectId: process.env.WALLCRAWLER_PROJECT_ID,
            modelName: "anthropic/claude-3-5-sonnet-latest",
            modelClientOptions: {
              apiKey: process.env.ANTHROPIC_API_KEY,
            },
            useAPI: false,
          });
        } else {
          stagehand = new Stagehand({
            env: "WALLCRAWLER",
            apiKey: process.env.WALLCRAWLER_API_KEY,
            projectId: process.env.WALLCRAWLER_PROJECT_ID,
            modelName: "anthropic/claude-3-5-sonnet-latest",
            modelClientOptions: {
              apiKey: process.env.ANTHROPIC_API_KEY,
            },
            browserbaseSessionCreateParams: {
              projectId: process.env.WALLCRAWLER_PROJECT_ID || "jobseek-dev",
              userMetadata: {
                userId: auth.userId,
                action: "apply",
                jobUrl,
              },
            },
            useAPI: false,
          });

          await stagehand.init();
        }

        const page = stagehand.page;

        await page.goto(jobUrl);
        await page.act({ action: "Click the Apply or Apply Now button for this job" });

        const application = await dynamodbService.saveApplication({
          userId: auth.userId,
          applicationId: `app_${Date.now()}`,
          jobId: jobDetails.jobId || `job_${Date.now()}`,
          jobTitle: jobDetails.title,
          company: jobDetails.company,
          appliedAt: new Date().toISOString(),
          status: "applied",
          notes: resumeS3Key
            ? `Resume: ${resumeS3Key}\nJob URL: ${jobUrl}`
            : `Job URL: ${jobUrl}`,
        });

        return c.json({
          success: true,
          applicationId: application.applicationId,
          sessionId,
          message: "Application process initiated. Complete the form in the browser.",
        });
      } finally {
        if (stagehand && !sessionId) {
          await stagehand.close();
        }
      }
    }

    return c.json({
      success: true,
      message:
        "Please apply directly on the job board. Sign in to track your applications.",
    });
  } catch (error) {
    console.error("Failed to apply to job:", error);
    return c.json({ error: "Failed to apply to job" }, 500);
  }
});

api.get("/wallcrawler/sessions", requireAuthOrAnonymous(), async (c) => {
  try {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const wallcrawler = createWallcrawlerClient();
    const query = JSON.stringify({ userId: auth.userId });
    const wallcrawlerResponse = await wallcrawler.sessions.list({
      q: query,
      status: "RUNNING",
    });

    const sessions = (wallcrawlerResponse?.data || []).map((session) => ({
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      region: session.region,
      keywords: session.userMetadata?.keywords || "",
      location: session.userMetadata?.location || "",
      jobBoard: session.userMetadata?.jobBoard || "",
    }));

    return c.json({ sessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return c.json({ error: "Failed to fetch sessions" }, 500);
  }
});

api.get(
  "/wallcrawler/sessions/:sessionId/stream",
  requireAuthOrAnonymous(),
  async (c) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sessionId = c.req.param("sessionId");

    return streamSSE(
      c,
      async (stream) => {
        const send = async (type: string, data: unknown) => {
          await stream.writeSSE({ data: JSON.stringify({ type, data }) });
        };

        try {
          const wallcrawler = createWallcrawlerClient();
          try {
            const wallcrawlerSession = await wallcrawler.sessions.retrieve(
              sessionId
            );
            const sessionUserId = wallcrawlerSession.userMetadata?.userId;
            if (sessionUserId && sessionUserId !== auth.userId) {
              await send("error", { message: "Unauthorized" });
              await stream.close();
              return;
            }

            await send("session", {
              id: wallcrawlerSession.id,
              status: wallcrawlerSession.status,
              createdAt: wallcrawlerSession.createdAt,
              updatedAt: wallcrawlerSession.updatedAt,
              startedAt: wallcrawlerSession.startedAt,
              endedAt: wallcrawlerSession.endedAt,
              region: wallcrawlerSession.region,
              userMetadata: wallcrawlerSession.userMetadata,
              connectUrl: wallcrawlerSession.connectUrl,
            });
          } catch (error) {
            console.error("Failed to retrieve Wallcrawler session:", error);
            await send("session", null);
          }

          if (auth.isAuthenticated) {
            const searchResults = await dynamodbService.getSearchResults(
              sessionId
            );
            const jobResults = searchResults.length > 0 ? searchResults[0] : null;
            await send("jobs", jobResults?.jobs || []);
            await send("totalJobs", jobResults?.totalJobsFound || 0);
          } else {
            await send("jobs", []);
            await send("totalJobs", 0);
          }

          const historicalLogs = await dynamodbService.getActionLogs(sessionId);
          await send("logs-history", historicalLogs);

          const unsubscribe = actionLogEmitter.subscribeToSession(sessionId, {
            onLog: (log) => send("log", log),
            onJobs: (jobs) => send("jobs-update", jobs),
            onTotalJobs: (totalJobs) => send("totalJobs-update", totalJobs),
          });

          const heartbeat = setInterval(async () => {
            try {
              await stream.writeSSE({ event: "heartbeat", data: "" });
            } catch {
              clearInterval(heartbeat);
              unsubscribe();
            }
          }, 30000);

          stream.onAbort(() => {
            clearInterval(heartbeat);
            unsubscribe();
          });
        } catch (error) {
          console.error("SSE stream error:", error);
          await send("error", {
            message: error instanceof Error ? error.message : "Stream failed",
          });
          await stream.close();
        }
      },
      {
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      }
    );
  }
);
