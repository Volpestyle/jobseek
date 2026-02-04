import { NextRequest, NextResponse } from "next/server";
import { saveScrape, getLatestScrape } from "@/lib/db";
import { scrapeLinkedInJobs } from "@/lib/scraper";

export const maxDuration = 900; // 15 min timeout for long scrapes

export async function POST(req: NextRequest) {
  const logPrefix = "[API /api/scrape]";
  console.log(`${logPrefix} Request received`);

  try {
    const body = await req.json();
    const { filters, maxPages = 5 } = body;
    console.log(`${logPrefix} Payload:`, { filters, maxPages });

    if (!filters || !filters.keywords) {
      console.warn(`${logPrefix} Missing keywords`);
      return NextResponse.json(
        { error: "Keywords filter is required." },
        { status: 400 }
      );
    }

    if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
      console.error(`${logPrefix} Missing credentials`);
      return NextResponse.json(
        {
          error:
            "Missing LINKEDIN_EMAIL or LINKEDIN_PASSWORD. Add them to .env.local",
        },
        { status: 500 }
      );
    }

    const showBrowser = !!filters.showBrowser;
    const summarize =
      typeof filters?.summarize === "boolean"
        ? filters.summarize
        : process.env.JOB_SUMMARY_ENABLED
          ? process.env.JOB_SUMMARY_ENABLED === "1" ||
            process.env.JOB_SUMMARY_ENABLED?.toLowerCase() === "true"
          : true;
    const summarizeModel =
      filters?.summarizeModel || process.env.JOB_SUMMARY_MODEL || "haiku";
    const summarizeTimeout =
      parseInt(process.env.JOB_SUMMARY_TIMEOUT || "60", 10);
    const summarizeMax =
      parseInt(process.env.JOB_SUMMARY_MAX || "0", 10);

    console.log(
      `${logPrefix} Starting scrape (headless: ${!showBrowser}, summarize: ${summarize})`
    );

    const logs: string[] = [];
    const jobs = await scrapeLinkedInJobs({
      filters,
      maxPages,
      showBrowser,
      summarize,
      summarizeModel,
      summarizeTimeout: summarizeTimeout * 1000,
      summarizeMax,
      onLog: (msg) => logs.push(msg),
    });

    console.log(`${logPrefix} Scraped ${jobs.length} jobs`);

    const scrapedAt = new Date().toISOString();
    const logsText = logs.join("\n");
    const scrapeId = saveScrape(filters, jobs, logsText || null);
    console.log(`${logPrefix} Saved to SQLite with id: ${scrapeId}`);

    return NextResponse.json({
      id: scrapeId,
      jobs,
      count: jobs.length,
      scrapedAt,
      logs: logsText,
    });
  } catch (err: unknown) {
    console.error(`${logPrefix} Unhandled catch:`, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: return latest scrape from SQLite
export async function GET() {
  const latest = getLatestScrape();

  if (!latest) {
    return NextResponse.json({ jobs: [], scrapedAt: null, filters: null });
  }

  return NextResponse.json({
    id: latest.id,
    jobs: latest.jobs,
    scrapedAt: latest.scraped_at,
    filters: latest.filters,
  });
}
