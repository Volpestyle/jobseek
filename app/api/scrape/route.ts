import { NextRequest } from "next/server";
import { saveScrape, getLatestScrape } from "@/lib/db";
import { buildSearchUrl, type ScrapedJob } from "@/lib/scraper";
import { streamClaudeAgentic, type ClaudeStreamEvent } from "@/lib/claude";
import { loadSummaryFields } from "@/lib/summary-fields";

export const maxDuration = 900;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JOB_MARKER_RE = /<!--\s*JOB:\s*(\{[\s\S]*?\})\s*-->/g;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters, maxPages = 5 } = body;

    if (!filters || !filters.keywords) {
      return new Response(
        JSON.stringify({ error: "Keywords filter is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const linkedinEmail = process.env.LINKEDIN_EMAIL || "";
    const linkedinPassword = process.env.LINKEDIN_PASSWORD || "";

    if (!linkedinEmail || !linkedinPassword) {
      return new Response(
        JSON.stringify({
          error: "Missing LINKEDIN_EMAIL or LINKEDIN_PASSWORD. Add them to .env.local",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const showBrowser = !!filters.showBrowser;
    const searchUrl = buildSearchUrl(filters);
    const summaryFields = loadSummaryFields();

    const fieldDescriptions = summaryFields
      .filter((f) => f.key)
      .map((f) => `- "${f.key}" (${f.type}): ${f.description}`)
      .join("\n");

    const systemPrompt = `You are a LinkedIn job scraper. You will use browser tools to scrape job listings from LinkedIn search results and extract structured data from each job.

LinkedIn credentials (use these to log in):
- Email: ${linkedinEmail}
- Password: ${linkedinPassword}

Instructions:
1. Launch the browser (headless: ${!showBrowser})
2. Navigate to https://www.linkedin.com/login
3. Log in using the credentials above (type them into the form fields)
4. Wait for the feed to load to confirm login success
5. Navigate to this search URL: ${searchUrl}
6. For each page (up to ${maxPages} pages):
   a. Wait for the job listings to load
   b. Scroll down to load all job cards on the page
   c. Take a screenshot to see the listings
   d. Use browser_get_content to read the page content
   e. For each job listing you can see:
      - Click on the job card to open its detail panel
      - Wait for the description to load
      - Use browser_get_content to read the full job description
      - Extract all structured fields (see below)
      - Output the job data as a marker in this exact format:
        <!-- JOB: {"title":"...","company":"...","location":"...","link":"...","salary":null,"posted":null,"description":"...","summary":"...","extracted":{...}} -->
   f. After processing all jobs on the page, look for the next page button and click it
   g. If no next page exists, stop
7. Close the browser when done

For each job, extract these fields into the "extracted" object:
${fieldDescriptions}

Also generate:
- "summary": A concise 2-4 sentence summary of the role
- "description": The raw job description text (first 3000 chars max)

The "link" field should be the full LinkedIn job URL (e.g. https://www.linkedin.com/jobs/view/12345678/).
If salary is visible on the card or in the description, include it. Otherwise use null.
If a posted date is visible, include it. Otherwise use null.

Important:
- Take screenshots frequently to see what's on the page
- Use browser_get_elements to find clickable elements when needed
- Wait between actions to avoid detection
- If you encounter a CAPTCHA, report it and stop
- Report each action you take so the user can follow along
- Make sure to scroll within the job list to reveal all cards before processing
- Output each job as a <!-- JOB: {...} --> marker as soon as you have its data`;

    const userMessage = `Scrape LinkedIn jobs from: ${searchUrl} (up to ${maxPages} pages)`;

    const encoder = new TextEncoder();
    let abortFn: (() => void) | null = null;
    const scrapeId = `scrape-${Date.now()}`;

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        let textBuffer = "";
        const collectedJobs: ScrapedJob[] = [];
        const seenLinks = new Set<string>();
        let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

        const finish = () => {
          if (isClosed) return;
          isClosed = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          try {
            controller.close();
          } catch {
            // Ignore
          }
        };

        const sse = (event: string, data: unknown) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            finish();
          }
        };

        const saveResults = () => {
          if (collectedJobs.length > 0) {
            const dbId = saveScrape(filters, collectedJobs, null);
            return dbId;
          }
          return null;
        };

        const parseJobsFromBuffer = () => {
          let match: RegExpExecArray | null;
          const regex = new RegExp(JOB_MARKER_RE.source, "g");
          while ((match = regex.exec(textBuffer)) !== null) {
            try {
              const jobData = JSON.parse(match[1]) as Record<string, unknown>;
              if (!jobData.title || !jobData.company || !jobData.link) continue;

              const job: ScrapedJob = {
                title: jobData.title as string,
                company: jobData.company as string,
                location: (jobData.location as string) || "",
                link: (jobData.link as string).split("?")[0],
                salary: (jobData.salary as string) || null,
                posted: (jobData.posted as string) || null,
                description: (jobData.description as string) || null,
                summary: (jobData.summary as string) || null,
                extracted: (jobData.extracted as Record<string, string | string[] | null>) || null,
              };

              if (seenLinks.has(job.link)) continue;
              seenLinks.add(job.link);
              collectedJobs.push(job);

              sse("job", { index: collectedJobs.length - 1, job });
            } catch {
              // Invalid JSON in marker, skip
            }
          }
          // Remove processed markers from buffer, keep trailing text
          textBuffer = textBuffer.replace(
            new RegExp(JOB_MARKER_RE.source, "g"),
            ""
          );
        };

        const onAbort = () => {
          abortFn?.();
          const dbId = saveResults();
          if (dbId !== null) {
            sse("complete", { scrapeId: dbId, jobCount: collectedJobs.length });
          }
          finish();
        };

        req.signal.addEventListener("abort", onAbort);

        if (req.signal.aborted) {
          finish();
          return;
        }

        // Start timeout
        timeoutTimer = setTimeout(() => {
          abortFn?.();
          const dbId = saveResults();
          sse("log", { message: "Scrape timed out, saving partial results" });
          if (dbId !== null) {
            sse("complete", { scrapeId: dbId, jobCount: collectedJobs.length });
          } else {
            sse("error", { message: "Scrape timed out with no jobs found" });
          }
          finish();
        }, TIMEOUT_MS);

        sse("start", { scrapeId });

        const onEvent = (event: ClaudeStreamEvent) => {
          switch (event.type) {
            case "delta":
              if (event.content) {
                textBuffer += event.content;
                parseJobsFromBuffer();
                sse("log", { message: event.content });
              }
              break;
            case "thinking":
              sse("log", { message: `[thinking] ${event.content}` });
              break;
            case "tool_use":
              sse("tool", {
                type: "tool_use",
                tool: event.toolName,
                message: event.content,
              });
              break;
            case "tool_result":
              sse("tool", {
                type: "tool_result",
                tool: event.toolName,
                message: event.content,
              });
              break;
            case "done": {
              // Final parse of any remaining text
              if (event.content) {
                textBuffer += event.content;
                parseJobsFromBuffer();
              }
              const dbId = saveResults();
              sse("complete", {
                scrapeId: dbId,
                jobCount: collectedJobs.length,
              });
              finish();
              break;
            }
            case "error":
              // Save partial results on error
              saveResults();
              sse("error", { message: event.error });
              finish();
              break;
          }
        };

        const result = streamClaudeAgentic(systemPrompt, userMessage, onEvent);
        abortFn = result.abort;

        result.promise.catch((err) => {
          if (!isClosed) {
            saveResults();
            sse("error", {
              message: err instanceof Error ? err.message : "Unknown error",
            });
            finish();
          }
        });
      },
      cancel() {
        abortFn?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Encoding": "none",
      },
    });
  } catch (error) {
    console.error("[API /api/scrape] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to start scrape",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// GET: return latest scrape from SQLite
export async function GET() {
  const latest = getLatestScrape();

  if (!latest) {
    return Response.json({ jobs: [], scrapedAt: null, filters: null });
  }

  return Response.json({
    id: latest.id,
    jobs: latest.jobs,
    scrapedAt: latest.scraped_at,
    filters: latest.filters,
  });
}
