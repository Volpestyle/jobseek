import { Stagehand } from "@wallcrawler/stagehand";
import { z } from "zod";
import { DEFAULT_JOB_BOARDS } from "./constants/default-job-boards";
import { dynamodbService } from "./db/dynamodb.service";
import { localStorageService } from "./storage/local-storage.service";
import { actionLogEmitter } from "./events/action-logs";
import type { LogLine } from "@wallcrawler/stagehand/types/log";

export interface JobSearchParams {
  keywords: string;
  location: string;
  jobBoard: string;
  userMetadata?: Record<string, unknown>;
}

export interface JobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
}

// Zod schema for extracting job listings
const jobListingsSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      salary: z.string().optional(),
      url: z.string(),
      description: z.string(),
    })
  ),
});

// Type derived from the Zod schema
type JobListingsExtractResult = z.infer<typeof jobListingsSchema>;

export type StreamEvent =
  | { type: "session_started"; sessionId: string; debugUrl?: string }
  | { type: "job_found"; job: JobResult; index: number }
  | { type: "status_update"; message: string }
  | { type: "complete"; totalJobs: number; sessionId: string }
  | { type: "error"; error: string };

export class WallcrawlerService {
  async runJobSearch(
    params: JobSearchParams
  ): Promise<{ sessionId: string; debugUrl?: string; jobs: JobResult[] }> {
    let stagehand: Stagehand | null = null;
    let sessionId: string = "";

    try {
      // Initialize Stagehand with logger
      stagehand = new Stagehand({
        env: "WALLCRAWLER",
        apiKey: process.env.WALLCRAWLER_API_KEY,
        projectId: process.env.WALLCRAWLER_PROJECT_ID,
        modelName: "anthropic/claude-3-5-sonnet-latest",
        modelClientOptions: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
        verbose: 2,
        enableCaching: true,
        domSettleTimeoutMs: 30000,
        browserbaseSessionCreateParams: {
          projectId: process.env.WALLCRAWLER_PROJECT_ID || "jobseek-dev",
          userMetadata: params.userMetadata || {},
        },
        useAPI: false,
        logger: (logLine: LogLine) => {
          // Map log categories to action types
          const mapLogCategory = (
            category?: string
          ):
            | "act"
            | "extract"
            | "observe"
            | "navigate"
            | "scroll"
            | "error"
            | "info"
            | "debug" => {
            if (!category) return "info";
            const lowerCategory = category.toLowerCase();
            if (lowerCategory.includes("act")) return "act";
            if (lowerCategory.includes("extract")) return "extract";
            if (lowerCategory.includes("observe")) return "observe";
            if (
              lowerCategory.includes("navigate") ||
              lowerCategory.includes("goto")
            )
              return "navigate";
            if (lowerCategory.includes("scroll")) return "scroll";
            if (lowerCategory.includes("error")) return "error";
            if (lowerCategory.includes("debug")) return "debug";
            return "info";
          };

          const actionLog = {
            id: `${sessionId}_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            timestamp: logLine.timestamp || new Date().toISOString(),
            action: logLine.message,
            type: mapLogCategory(logLine.category),
            details: logLine.auxiliary
              ? JSON.stringify(logLine.auxiliary)
              : undefined,
            status:
              logLine.level === 0 ? ("error" as const) : ("success" as const),
          };

          // Emit for real-time SSE
          if (sessionId) {
            actionLogEmitter.emitLog(sessionId, actionLog);

            // Store in DynamoDB for persistence
            dynamodbService
              .saveActionLog(sessionId, actionLog)
              .catch(console.error);
          }
        },
      });

      const initResult = await stagehand.init();
      sessionId = initResult.sessionId;
      const debugUrl = initResult.debugUrl;
      const page = stagehand.page;

      // Find the job board configuration
      const jobBoardConfig = DEFAULT_JOB_BOARDS.find(
        (board) => board.id === params.jobBoard
      );
      if (!jobBoardConfig) {
        throw new Error(`Unsupported job board: ${params.jobBoard}`);
      }

      const url = jobBoardConfig.url;

      await page.goto(url);

      // Use Stagehand's AI capabilities to search
      await page.act({
        action: `Search for "${params.keywords}" jobs in "${params.location}"`,
      });

      // Wait for results to load
      await page.waitForTimeout(3000);

      // Extract job listings
      const result: JobListingsExtractResult = await page.extract({
        instruction: `Extract all job listings from the page:
          1. Job title
          2. Company name
          3. Location
          4. Salary information (if available)
          5. URL link to the job posting
          6. Brief job description`,
        schema: jobListingsSchema,
      });

      // Save job search results
      const userId = params.userMetadata?.userId as string;
      const isAnonymous = params.userMetadata?.isAnonymous as boolean;

      const jobs = result.jobs.map((job, index) => ({
        jobId: `${sessionId}_${index}_${Date.now()}`,
        ...job,
        source: params.jobBoard,
      }));

      if (userId) {
        const jobSearchResult = {
          userId,
          searchId: sessionId,
          boardName: params.jobBoard,
          sessionId,
          anonymousId: isAnonymous ? (params.userMetadata?.anonymousId as string) : undefined,
          jobs,
          status: "completed" as const,
          totalJobsFound: result.jobs.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessionMetadata: {
            debugUrl,
            region: "us-east-1",
            startedAt: new Date().toISOString(),
          },
          ttl: isAnonymous ? Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) : undefined
        };

        // Always save to DynamoDB (both authenticated and anonymous users)
        await dynamodbService.saveJobSearchResults(jobSearchResult);

        // Emit job update for real-time streaming
        actionLogEmitter.emitJobUpdate(sessionId, jobs);
        actionLogEmitter.emitTotalJobsUpdate(sessionId, result.jobs.length);
      }

      return {
        sessionId,
        debugUrl,
        jobs: result.jobs.map((job) => ({
          ...job,
          source: params.jobBoard,
        })),
      };
    } catch (error) {
      console.error("Failed to run job search:", error);
      throw error;
    } finally {
      // Always close the browser
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (closeError) {
          console.error("Failed to close Stagehand:", closeError);
        }
      }
    }
  }

  async runJobSearchWithStream(
    params: JobSearchParams,
    onEvent: (event: StreamEvent) => Promise<void>
  ): Promise<void> {
    let stagehand: Stagehand | null = null;
    let sessionId: string = "";

    try {
      // Initialize Stagehand with logger
      stagehand = new Stagehand({
        env: "WALLCRAWLER",
        apiKey: process.env.WALLCRAWLER_API_KEY,
        projectId: process.env.WALLCRAWLER_PROJECT_ID,
        modelName: "anthropic/claude-3-5-sonnet-latest",
        modelClientOptions: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
        verbose: 2,
        enableCaching: true,
        domSettleTimeoutMs: 30000,
        browserbaseSessionCreateParams: {
          projectId: process.env.WALLCRAWLER_PROJECT_ID || "jobseek-dev",
          userMetadata: params.userMetadata || {},
        },
        useAPI: false,
        logger: (logLine: LogLine) => {
          // Map log categories to action types
          const mapLogCategory = (
            category?: string
          ):
            | "act"
            | "extract"
            | "observe"
            | "navigate"
            | "scroll"
            | "error"
            | "info"
            | "debug" => {
            if (!category) return "info";
            const lowerCategory = category.toLowerCase();
            if (lowerCategory.includes("act")) return "act";
            if (lowerCategory.includes("extract")) return "extract";
            if (lowerCategory.includes("observe")) return "observe";
            if (
              lowerCategory.includes("navigate") ||
              lowerCategory.includes("goto")
            )
              return "navigate";
            if (lowerCategory.includes("scroll")) return "scroll";
            if (lowerCategory.includes("error")) return "error";
            if (lowerCategory.includes("debug")) return "debug";
            return "info";
          };

          const actionLog = {
            id: `${sessionId}_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            timestamp: logLine.timestamp || new Date().toISOString(),
            action: logLine.message,
            type: mapLogCategory(logLine.category),
            details: logLine.auxiliary
              ? JSON.stringify(logLine.auxiliary)
              : undefined,
            status:
              logLine.level === 0 ? ("error" as const) : ("success" as const),
          };

          // Emit for real-time SSE
          if (sessionId) {
            actionLogEmitter.emitLog(sessionId, actionLog);

            // Store in DynamoDB for persistence
            dynamodbService
              .saveActionLog(sessionId, actionLog)
              .catch(console.error);
          }
        },
      });

      const initResult = await stagehand.init();
      sessionId = initResult.sessionId;
      const debugUrl = initResult.debugUrl;
      const page = stagehand.page;

      // Send session started event
      await onEvent({
        type: "session_started",
        sessionId,
        debugUrl,
      });

      // Find the job board configuration
      const jobBoardConfig = DEFAULT_JOB_BOARDS.find(
        (board) => board.id === params.jobBoard
      );
      if (!jobBoardConfig) {
        throw new Error(`Unsupported job board: ${params.jobBoard}`);
      }

      const url = jobBoardConfig.url;
      await page.goto(url);

      // Send status update
      await onEvent({
        type: "status_update",
        message: `Searching for "${params.keywords}" jobs in "${params.location}"...`,
      });

      // Use Stagehand's AI capabilities to search
      await page.act({
        action: `Search for "${params.keywords}" jobs in "${params.location}"`,
      });

      // Wait for results to load
      await page.waitForTimeout(3000);

      // Extract job listings
      const result: JobListingsExtractResult = await page.extract({
        instruction: `Extract all job listings from the page:
          1. Job title
          2. Company name
          3. Location
          4. Salary information (if available)
          5. URL link to the job posting
          6. Brief job description`,
        schema: jobListingsSchema,
      });

      // Process and stream each job found
      const userId = params.userMetadata?.userId as string;
      const isAnonymous = params.userMetadata?.isAnonymous as boolean;
      const jobs = result.jobs.map((job, index) => ({
        jobId: `${sessionId}_${index}_${Date.now()}`,
        ...job,
        source: params.jobBoard, // Add the job board as the source
      }));

      // Stream each job to the client
      for (let i = 0; i < jobs.length; i++) {
        await onEvent({
          type: "job_found",
          job: result.jobs[i],
          index: i,
        });
      }

      // Save all results to database if authenticated
      if (userId && !isAnonymous) {
        const jobSearchResult = {
          userId,
          searchId: sessionId,
          boardName: params.jobBoard,
          sessionId: sessionId,
          jobs,
          status: "completed" as const,
          totalJobsFound: result.jobs.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessionMetadata: {
            debugUrl,
            region: "us-east-1",
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
          },
        };

        await dynamodbService.saveJobSearchResults(jobSearchResult);
      }

      // Emit final job update for real-time streaming
      actionLogEmitter.emitJobUpdate(sessionId, jobs);
      actionLogEmitter.emitTotalJobsUpdate(sessionId, result.jobs.length);

      // Send completion event
      await onEvent({
        type: "complete",
        totalJobs: result.jobs.length,
        sessionId,
      });
    } catch (error) {
      console.error("Failed to run job search:", error);
      await onEvent({
        type: "error",
        error: error instanceof Error ? error.message : "Search failed",
      });
      throw error;
    } finally {
      // Always close the browser
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (closeError) {
          console.error("Failed to close Stagehand:", closeError);
        }
      }
    }
  }

  async runJobSearchAsync(
    params: JobSearchParams & { 
      userMetadata: { 
        masterSearchId: string; 
        boardName: string;
        userId?: string;
        anonymousId?: string;
        isAnonymous?: boolean;
      } 
    }
  ): Promise<{ sessionId: string; debugUrl?: string }> {
    const stagehand = new Stagehand({
      env: "WALLCRAWLER",
      apiKey: process.env.WALLCRAWLER_API_KEY,
      projectId: process.env.WALLCRAWLER_PROJECT_ID,
      modelName: "anthropic/claude-3-5-sonnet-latest",
      modelClientOptions: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      verbose: 2,
      enableCaching: true,
      domSettleTimeoutMs: 30000,
      browserbaseSessionCreateParams: {
        projectId: process.env.WALLCRAWLER_PROJECT_ID || "jobseek-dev",
        userMetadata: params.userMetadata || {},
      },
      useAPI: false,
      logger: (logLine: LogLine) => {
        // Emit logs with master search context
        const mapLogCategory = (
          category?: string
        ):
          | "act"
          | "extract"
          | "observe"
          | "navigate"
          | "scroll"
          | "error"
          | "info"
          | "debug" => {
          if (!category) return "info";
          const lowerCategory = category.toLowerCase();
          if (lowerCategory.includes("act")) return "act";
          if (lowerCategory.includes("extract")) return "extract";
          if (lowerCategory.includes("observe")) return "observe";
          if (
            lowerCategory.includes("navigate") ||
            lowerCategory.includes("goto")
          )
            return "navigate";
          if (lowerCategory.includes("scroll")) return "scroll";
          if (lowerCategory.includes("error")) return "error";
          if (lowerCategory.includes("debug")) return "debug";
          return "info";
        };

        const actionLog = {
          id: `${params.userMetadata.masterSearchId}_${params.userMetadata.boardName}_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: "", // Will be filled when we have sessionId
          masterSearchId: params.userMetadata.masterSearchId,
          boardName: params.userMetadata.boardName,
          timestamp: logLine.timestamp || new Date().toISOString(),
          action: logLine.message,
          type: mapLogCategory(logLine.category),
          details: logLine.auxiliary
            ? JSON.stringify(logLine.auxiliary)
            : undefined,
          status:
            logLine.level === 0 ? ("error" as const) : ("success" as const),
        };
        
        // Emit for real-time SSE
        actionLogEmitter.emitLog(params.userMetadata.masterSearchId, actionLog);
      }
    });
    
    const { sessionId, debugUrl } = await stagehand.init();
    
    // Start the search in background
    this.runSearchInBackground(stagehand, params, sessionId).catch(console.error);
    
    // Return immediately with session info
    return { sessionId, debugUrl };
  }
  
  private async runSearchInBackground(
    stagehand: Stagehand,
    params: JobSearchParams & { 
      userMetadata: { 
        masterSearchId: string; 
        boardName: string;
        userId?: string;
        anonymousId?: string;
        isAnonymous?: boolean;
      } 
    },
    sessionId: string
  ) {
    try {
      const page = stagehand.page;
      const { masterSearchId, boardName, userId, anonymousId, isAnonymous } = params.userMetadata;
      
      // Find the job board configuration
      const jobBoardConfig = DEFAULT_JOB_BOARDS.find(
        (board) => board.id === params.jobBoard
      );
      if (!jobBoardConfig) {
        throw new Error(`Unsupported job board: ${params.jobBoard}`);
      }
      
      // Navigate and search
      await page.goto(jobBoardConfig.url);
      await page.act({
        action: `Search for "${params.keywords}" jobs in "${params.location}"`
      });
      
      // Extract jobs with intelligent pagination/scrolling
      let allJobs: any[] = [];
      let noNewJobsCount = 0;
      const MAX_NO_NEW_JOBS = 3;  // Stop after 3 attempts with no new jobs
      const MAX_TOTAL_JOBS = 100; // Reasonable limit
      
      while (noNewJobsCount < MAX_NO_NEW_JOBS && allJobs.length < MAX_TOTAL_JOBS) {
        // Wait for content to settle
        await page.waitForTimeout(2000);
        
        // Extract all currently visible jobs
        const result = await page.extract({
          instruction: "Extract all visible job listings on the page",
          schema: jobListingsSchema
        });
        
        const currentJobCount = result.jobs.length;
        
        if (currentJobCount > allJobs.length) {
          // New jobs found
          const newJobs = result.jobs.slice(allJobs.length);
          
          // Map jobs with IDs
          const mappedNewJobs = newJobs.map((job, idx) => ({
            jobId: `${sessionId}_${allJobs.length + idx}_${Date.now()}`,
            ...job,
            source: boardName
          }));
          
          allJobs = [...allJobs, ...mappedNewJobs];
          
          // Emit real-time update for this board
          actionLogEmitter.emitJobUpdate(sessionId, mappedNewJobs);
          actionLogEmitter.emitTotalJobsUpdate(sessionId, allJobs.length);
          
          // Save incremental results
          await dynamodbService.saveJobSearchResults({
            userId: userId || `ANON#${anonymousId}`,
            searchId: masterSearchId,
            boardName,
            sessionId,
            anonymousId: isAnonymous ? anonymousId : undefined,
            jobs: allJobs,
            status: 'running',
            totalJobsFound: allJobs.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ttl: isAnonymous ? 
                 Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) : undefined
          });
          
          noNewJobsCount = 0;
        } else {
          noNewJobsCount++;
        }
        
        // Let Stagehand figure out how to get more results
        const canLoadMore = await page.observe({
          instruction: "Can you load more job results? Look for: next button, 'Load More' button, ability to scroll for more results, or pagination controls. Return true if more results can be loaded, false otherwise."
        });
        
        if (canLoadMore && allJobs.length < MAX_TOTAL_JOBS) {
          await page.act({
            action: "Load more job results (click next, load more, or scroll down as appropriate)"
          });
        } else {
          break;  // No more results available or reached limit
        }
      }
      
      // Final update with completed status
      await dynamodbService.updateJobSearchResults(
        userId || `ANON#${anonymousId}`,
        masterSearchId,
        { 
          boardName,
          sessionId,
          status: 'completed',
          updatedAt: new Date().toISOString()
        }
      );
      
      // Update master search board status
      await dynamodbService.updateBoardSessionStatus(
        userId || `ANON#${anonymousId}`,
        masterSearchId,
        boardName,
        'completed',
        allJobs.length
      );
      
    } catch (error) {
      console.error(`Search failed for ${params.userMetadata.boardName}:`, error);
      
      // Update status to error
      await dynamodbService.updateBoardSessionStatus(
        params.userMetadata.userId || `ANON#${params.userMetadata.anonymousId}`,
        params.userMetadata.masterSearchId,
        params.userMetadata.boardName,
        'error',
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    } finally {
      await stagehand.close();
    }
  }
}

export const wallcrawlerService = new WallcrawlerService();
