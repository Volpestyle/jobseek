import { Stagehand } from '@wallcrawler/stagehand';
import { z } from 'zod';
import { DEFAULT_JOB_BOARDS } from './constants/default-job-boards';

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
}

export const wallcrawlerService = new WallcrawlerService();