import { Stagehand } from '@wallcrawler/stagehand';
import { z } from 'zod';
import { DEFAULT_JOB_BOARDS } from './constants/default-job-boards';
import { dynamodbService } from './db/dynamodb.service';
import { localStorageService } from './storage/local-storage.service';

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

export type StreamEvent = 
  | { type: 'session_started'; sessionId: string; debugUrl?: string }
  | { type: 'job_found'; job: JobResult; index: number }
  | { type: 'status_update'; message: string }
  | { type: 'complete'; totalJobs: number; sessionId: string }
  | { type: 'error'; error: string }

export class WallcrawlerService {
  async runJobSearch(params: JobSearchParams): Promise<{ sessionId: string; debugUrl?: string; jobs: JobResult[] }> {
    let stagehand: Stagehand | null = null;

    try {
      // Initialize Stagehand
      stagehand = new Stagehand({
        env: 'WALLCRAWLER',
        apiKey: process.env.WALLCRAWLER_API_KEY,
        projectId: process.env.WALLCRAWLER_PROJECT_ID,
        modelName: 'anthropic/claude-3-5-sonnet-latest',
        modelClientOptions: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
        verbose: 2,
        enableCaching: true,
        domSettleTimeoutMs: 30000,
        browserbaseSessionCreateParams: {
          projectId: process.env.WALLCRAWLER_PROJECT_ID || 'jobseek-dev',
          userMetadata: params.userMetadata || {},
        },
        useAPI: false
      });

      const { sessionId, debugUrl } = await stagehand.init();
      const page = stagehand.page;

      // Find the job board configuration
      const jobBoardConfig = DEFAULT_JOB_BOARDS.find(board => board.id === params.jobBoard);
      if (!jobBoardConfig) {
        throw new Error(`Unsupported job board: ${params.jobBoard}`);
      }

      const url = jobBoardConfig.url;

      await page.goto(url);

      // Use Stagehand's AI capabilities to search
      await page.act({
        action: `Search for "${params.keywords}" jobs in "${params.location}"`
      });

      // Wait for results to load
      await page.waitForTimeout(3000);

      // Extract job listings
      const jobListingsSchema = z.object({
        jobs: z.array(z.object({
          title: z.string(),
          company: z.string(),
          location: z.string(),
          salary: z.string().optional(),
          url: z.string(),
          description: z.string()
        }))
      });

      const result = await page.extract({
        instruction: `Extract all job listings from the page:
          1. Job title
          2. Company name
          3. Location
          4. Salary information (if available)
          5. URL link to the job posting
          6. Brief job description`,
        schema: jobListingsSchema
      });

      // Save job search results
      const userId = params.userMetadata?.userId as string;
      const isAnonymous = params.userMetadata?.isAnonymous as boolean;

      if (userId) {
        const jobSearchResult = {
          userId,
          searchSessionId: sessionId,
          jobs: result.jobs.map((job, index) => ({
            jobId: `${sessionId}_${index}_${Date.now()}`,
            ...job
          })),
          searchParams: {
            keywords: params.keywords,
            location: params.location,
            jobBoard: params.jobBoard
          },
          status: 'completed' as const,
          totalJobsFound: result.jobs.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessionMetadata: {
            debugUrl,
            region: 'us-east-1',
            startedAt: new Date().toISOString()
          }
        };

        // Save to appropriate storage based on user type
        if (!isAnonymous) {
          await dynamodbService.saveJobSearchResults(jobSearchResult);
        }
        // Note: For anonymous users, saving would be handled client-side
        // as we can't access localStorage from server
      }

      return {
        sessionId,
        debugUrl,
        jobs: result.jobs
      };
    } catch (error) {
      console.error('Failed to run job search:', error);
      throw error;
    } finally {
      // Always close the browser
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (closeError) {
          console.error('Failed to close Stagehand:', closeError);
        }
      }
    }
  }

  async runJobSearchWithStream(
    params: JobSearchParams,
    onEvent: (event: StreamEvent) => Promise<void>
  ): Promise<void> {
    let stagehand: Stagehand | null = null;
    let sessionId: string = '';

    try {
      // Initialize Stagehand
      stagehand = new Stagehand({
        env: 'WALLCRAWLER',
        apiKey: process.env.WALLCRAWLER_API_KEY,
        projectId: process.env.WALLCRAWLER_PROJECT_ID,
        modelName: 'anthropic/claude-3-5-sonnet-latest',
        modelClientOptions: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
        verbose: 2,
        enableCaching: true,
        domSettleTimeoutMs: 30000,
        browserbaseSessionCreateParams: {
          projectId: process.env.WALLCRAWLER_PROJECT_ID || 'jobseek-dev',
          userMetadata: params.userMetadata || {},
        },
        useAPI: false
      });

      const initResult = await stagehand.init();
      sessionId = initResult.sessionId;
      const debugUrl = initResult.debugUrl;
      const page = stagehand.page;

      // Send session started event
      await onEvent({ 
        type: 'session_started', 
        sessionId, 
        debugUrl 
      });

      // Find the job board configuration
      const jobBoardConfig = DEFAULT_JOB_BOARDS.find(board => board.id === params.jobBoard);
      if (!jobBoardConfig) {
        throw new Error(`Unsupported job board: ${params.jobBoard}`);
      }

      const url = jobBoardConfig.url;
      await page.goto(url);

      // Send status update
      await onEvent({ 
        type: 'status_update', 
        message: `Searching for "${params.keywords}" jobs in "${params.location}"...` 
      });

      // Use Stagehand's AI capabilities to search
      await page.act({
        action: `Search for "${params.keywords}" jobs in "${params.location}"`
      });

      // Wait for results to load
      await page.waitForTimeout(3000);

      // Extract job listings
      const jobListingsSchema = z.object({
        jobs: z.array(z.object({
          title: z.string(),
          company: z.string(),
          location: z.string(),
          salary: z.string().optional(),
          url: z.string(),
          description: z.string()
        }))
      });

      const result = await page.extract({
        instruction: `Extract all job listings from the page:
          1. Job title
          2. Company name
          3. Location
          4. Salary information (if available)
          5. URL link to the job posting
          6. Brief job description`,
        schema: jobListingsSchema
      });

      // Process and stream each job found
      const userId = params.userMetadata?.userId as string;
      const isAnonymous = params.userMetadata?.isAnonymous as boolean;
      const jobs = result.jobs.map((job, index) => ({
        jobId: `${sessionId}_${index}_${Date.now()}`,
        ...job
      }));

      // Stream each job to the client
      for (let i = 0; i < jobs.length; i++) {
        await onEvent({ 
          type: 'job_found', 
          job: result.jobs[i], 
          index: i 
        });
      }

      // Save all results to database if authenticated
      if (userId && !isAnonymous) {
        const jobSearchResult = {
          userId,
          searchSessionId: sessionId,
          jobs,
          searchParams: {
            keywords: params.keywords,
            location: params.location,
            jobBoard: params.jobBoard
          },
          status: 'completed' as const,
          totalJobsFound: result.jobs.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sessionMetadata: {
            debugUrl,
            region: 'us-east-1',
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString()
          }
        };

        await dynamodbService.saveJobSearchResults(jobSearchResult);
      }

      // Send completion event
      await onEvent({ 
        type: 'complete', 
        totalJobs: result.jobs.length,
        sessionId 
      });

    } catch (error) {
      console.error('Failed to run job search:', error);
      await onEvent({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Search failed' 
      });
      throw error;
    } finally {
      // Always close the browser
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (closeError) {
          console.error('Failed to close Stagehand:', closeError);
        }
      }
    }
  }
}

export const wallcrawlerService = new WallcrawlerService();