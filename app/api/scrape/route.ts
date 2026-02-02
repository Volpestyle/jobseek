import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { saveScrape, getLatestScrape } from "@/lib/db";

export const maxDuration = 300; // 5 min timeout for long scrapes

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

    // Check for credentials
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

    const scriptPath = path.join(process.cwd(), "scripts", "scrape_jobs.py");
    console.log(`${logPrefix} Script path resolved: ${scriptPath}`);

    if (!fs.existsSync(scriptPath)) {
      console.error(`${logPrefix} Script not found at: ${scriptPath}`);
      return NextResponse.json(
        { error: "scrape_jobs.py not found in scripts/" },
        { status: 500 }
      );
    }

    const filtersJson = JSON.stringify(filters);
    console.log(`${logPrefix} Spawning python script...`);

    const pythonPath = path.join(process.cwd(), "venv", "bin", "python3");
    console.log(`${logPrefix} Using python at: ${pythonPath}`);

    // Fallback to system python if venv doesn't exist (though we expect it to)
    const executable = fs.existsSync(pythonPath) ? pythonPath : "python3";
    console.log(`${logPrefix} Final executable: ${executable}`);

    const result = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        const proc = spawn(
          executable,
          [
            scriptPath,
            "--filters",
            filtersJson,
            "--max-pages",
            String(maxPages),
          ],
          {
            env: {
              ...process.env,
              LINKEDIN_EMAIL: process.env.LINKEDIN_EMAIL,
              LINKEDIN_PASSWORD: process.env.LINKEDIN_PASSWORD,
            },
            timeout: 300000, // 5 min
          }
        );

        console.log(`${logPrefix} Process spawned with PID: ${proc.pid}`);

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        proc.stderr.on("data", (data: Buffer) => {
          const chunk = data.toString();
          stderr += chunk;
        });

        proc.on("close", (code: number | null) => {
          console.log(`${logPrefix} Process closed with code: ${code}`);
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            console.error(`${logPrefix} Process failed.\nstdout: ${stdout}\nstderr: ${stderr}`);
            reject(
              new Error(
                `Scraper exited with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`
              )
            );
          }
        });

        proc.on("error", (err: Error) => {
          console.error(`${logPrefix} Spawn error:`, err);
          reject(err);
        });
      }
    );

    console.log(`${logPrefix} Script finished. Parsing stdout...`);

    // stdout should be clean JSON array
    let jobs;
    try {
      jobs = JSON.parse(result.stdout.trim());
      console.log(`${logPrefix} Parsed ${jobs.length} jobs.`);
    } catch (e) {
      console.error(`${logPrefix} JSON parse error:`, e);
      console.log(`${logPrefix} Raw stdout:`, result.stdout);

      // If the scraper output an error JSON
      try {
        const errObj = JSON.parse(result.stdout.trim());
        return NextResponse.json(errObj, { status: 500 });
      } catch {
        return NextResponse.json(
          {
            error: "Failed to parse scraper output.",
            details: result.stderr,
            raw: result.stdout.slice(0, 500),
          },
          { status: 500 }
        );
      }
    }

    // Save results to SQLite
    const scrapedAt = new Date().toISOString();
    const scrapeId = saveScrape(filters, jobs, result.stderr || null);
    console.log(`${logPrefix} Saved to SQLite with id: ${scrapeId}`);

    return NextResponse.json({
      id: scrapeId,
      jobs,
      count: jobs.length,
      scrapedAt,
      logs: result.stderr,
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
