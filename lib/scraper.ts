import type { Page } from "playwright";
import {
  launchStealthBrowser,
  loginToLinkedIn,
  humanDelay,
  humanScroll,
} from "./browser";
import { callClaudeJSON } from "./claude";
import {
  loadSummaryFields,
  buildSummarySchema,
  buildSummaryPrompt,
  type SummaryField,
} from "./summary-fields";

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  link: string;
  salary: string | null;
  posted: string | null;
  description?: string | null;
  summary?: string | null;
  extracted?: Record<string, string | string[] | null> | null;
}

export interface ScrapeOptions {
  filters: {
    keywords?: string;
    location?: string;
    remote?: boolean;
    experience?: string;
    date_posted?: string;
  };
  maxPages?: number;
  showBrowser?: boolean;
  summarize?: boolean;
  summarizeModel?: string;
  summarizeTimeout?: number;
  summarizeMax?: number;
  summaryFieldsPath?: string;
  onLog?: (msg: string) => void;
}

const EXPERIENCE_MAP: Record<string, string> = {
  internship: "1",
  entry: "2",
  associate: "3",
  "mid-senior": "4",
  director: "5",
  executive: "6",
};

const DATE_MAP: Record<string, string> = {
  "24h": "r86400",
  week: "r604800",
  month: "r2592000",
};

const JOB_DESC_SELECTORS = [
  ".jobs-description-content__text",
  ".jobs-box__html-content",
  ".jobs-description__content",
  ".jobs-description-content__text--stretch",
];

function buildSearchUrl(filters: ScrapeOptions["filters"]): string {
  const base = "https://www.linkedin.com/jobs/search/?";
  const params: string[] = [];

  if (filters.keywords) {
    params.push(`keywords=${encodeURIComponent(filters.keywords)}`);
  }
  if (filters.location) {
    params.push(`location=${encodeURIComponent(filters.location)}`);
  }
  if (filters.remote) {
    params.push("f_WT=2");
  }
  if (filters.experience) {
    const code = EXPERIENCE_MAP[filters.experience.toLowerCase()];
    if (code) params.push(`f_E=${code}`);
  }
  if (filters.date_posted) {
    const code = DATE_MAP[filters.date_posted];
    if (code) params.push(`f_TPR=${code}`);
  }

  params.push("sortBy=DD");
  return base + params.join("&");
}

function extractJobId(link: string): string | null {
  if (!link) return null;
  const parts = link.split("/jobs/view/");
  if (parts.length < 2) return null;
  const id = parts[1].split("/")[0].split("?")[0];
  return id || null;
}

function normalizeWhitespace(text: string): string {
  return text.trim().split(/\s+/).join(" ");
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3).trimEnd() + "...";
}

async function scrapePage(page: Page): Promise<ScrapedJob[]> {
  await humanDelay(1, 2);
  await humanScroll(page, 4);
  await humanDelay(0.5, 1);

  const jobs: ScrapedJob[] = await page.evaluate(() => {
    const cards = document.querySelectorAll(
      ".job-card-container, .jobs-search-results__list-item, li.ember-view.occludable-update"
    );
    const results: ScrapedJob[] = [];
    for (const card of cards) {
      const titleEl = card.querySelector(
        ".job-card-list__title, .job-card-container__link, a.job-card-list__title--link"
      );
      const companyEl = card.querySelector(
        ".job-card-container__primary-description, .artdeco-entity-lockup__subtitle, .job-card-container__company-name"
      );
      const locationEl = card.querySelector(
        ".job-card-container__metadata-wrapper li, .artdeco-entity-lockup__caption, .job-card-container__metadata-item"
      );
      const linkEl =
        card.querySelector('a[href*="/jobs/view/"]') || titleEl;
      const salaryEl = card.querySelector(
        ".job-card-list__salary-info, .salary-main-rail__compensation-header"
      );
      const timeEl = card.querySelector("time");

      const title = (titleEl as HTMLElement)?.innerText?.trim() || "";
      const company = (companyEl as HTMLElement)?.innerText?.trim() || "";
      const location = (locationEl as HTMLElement)?.innerText?.trim() || "";
      const link = (linkEl as HTMLAnchorElement)?.href || "";
      const salary =
        (salaryEl as HTMLElement)?.innerText?.trim() || null;
      const posted =
        timeEl?.getAttribute("datetime") ||
        timeEl?.innerText?.trim() ||
        null;

      if (title) {
        results.push({
          title,
          company,
          location,
          link: link.split("?")[0],
          salary,
          posted,
        });
      }
    }
    return results;
  });

  return jobs;
}

async function goNextPage(page: Page, currentPage: number): Promise<boolean> {
  try {
    const nextBtn = page.locator(
      `button[aria-label="Page ${currentPage + 1}"]`
    );
    if ((await nextBtn.count()) > 0) {
      await humanDelay(0.5, 1.5);
      await nextBtn.click();
      await page.waitForLoadState("domcontentloaded");
      await humanDelay(1.5, 3);
      return true;
    }
  } catch {
    // No next page
  }
  return false;
}

async function expandDescription(page: Page): Promise<void> {
  const selectors = [
    'button[aria-label="See more description"]',
    'button[aria-label="See more"]',
    'button:has-text("See more")',
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if ((await btn.count()) > 0) {
        await btn.click();
        await humanDelay(0.2, 0.6);
        return;
      }
    } catch {
      continue;
    }
  }
}

async function extractDescriptionText(page: Page): Promise<string | null> {
  for (const sel of JOB_DESC_SELECTORS) {
    try {
      await page.waitForSelector(sel, { timeout: 2500 });
      const el = page.locator(sel).first();
      if ((await el.count()) > 0) {
        const text = await el.innerText();
        const normalized = normalizeWhitespace(text);
        if (normalized) return normalized;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function openJobDetail(
  page: Page,
  jobLink: string,
  log: (msg: string) => void
): Promise<boolean> {
  const jobId = extractJobId(jobLink);
  if (!jobId) {
    log("Could not extract job id from link.");
    return false;
  }

  const selector = `a[href*="/jobs/view/${jobId}"]`;
  const linkEl = page.locator(selector).first();
  try {
    const count = await linkEl.count();
    log(`Looking for job link ${jobId} (count=${count})`);
    if (count === 0) return false;
    await linkEl.scrollIntoViewIfNeeded({ timeout: 10000 });
    await humanDelay(0.2, 0.6);
    await linkEl.click({ timeout: 10000, noWaitAfter: true });
    await humanDelay(0.6, 1.2);
    return true;
  } catch (err) {
    log(`Failed opening job detail: ${err}`);
    return false;
  }
}

async function enrichJobWithSummary(
  page: Page,
  job: ScrapedJob,
  summaryFields: SummaryField[],
  summarySchema: Record<string, unknown>,
  model: string,
  timeout: number,
  log: (msg: string) => void
): Promise<ScrapedJob> {
  const title = job.title.trim();
  const company = job.company.trim();
  if (title || company) {
    log(`Opening details for: ${title} @ ${company}`.trim());
  }

  const opened = await openJobDetail(page, job.link, log);
  if (!opened) {
    log("Could not open job detail; skipping summary.");
    return job;
  }

  await expandDescription(page);
  const description = await extractDescriptionText(page);
  if (description) {
    job.description = description;
  }

  if (!description) {
    log("No description text found; skipping summary.");
    return job;
  }

  const trimmedDesc = truncateText(description, 6000);
  const prompt = buildSummaryPrompt(job.title, job.company, trimmedDesc, summaryFields);

  const start = Date.now();
  const result = await callClaudeJSON(prompt, summarySchema, {
    model,
    timeout,
  });

  if (!result.data) {
    log("Summary failed or returned empty.");
    return job;
  }

  log(`Summary completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  job.summary = result.data.summary as string;

  const extracted: Record<string, string | string[] | null> = {};
  for (const field of summaryFields) {
    if (!field.key) continue;
    extracted[field.key] = result.data[field.key] as string | string[] | null;
  }
  job.extracted = extracted;

  if (!job.salary && result.data.salary) {
    job.salary = result.data.salary as string;
  }

  return job;
}

export async function scrapeLinkedInJobs(
  options: ScrapeOptions
): Promise<ScrapedJob[]> {
  const {
    filters,
    maxPages = 5,
    showBrowser = false,
    summarize = true,
    summarizeModel = process.env.JOB_SUMMARY_MODEL || "haiku",
    summarizeTimeout = parseInt(process.env.JOB_SUMMARY_TIMEOUT || "60", 10) * 1000,
    summarizeMax = parseInt(process.env.JOB_SUMMARY_MAX || "0", 10),
    summaryFieldsPath = process.env.JOB_SUMMARY_FIELDS_PATH,
    onLog,
  } = options;

  const log = (msg: string) => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    const formatted = `[${ts}] ${msg}`;
    console.log(formatted);
    onLog?.(formatted);
  };

  const email = process.env.LINKEDIN_EMAIL || "";
  const password = process.env.LINKEDIN_PASSWORD || "";

  if (!email || !password) {
    throw new Error("LINKEDIN_EMAIL and LINKEDIN_PASSWORD env vars required.");
  }

  const searchUrl = buildSearchUrl(filters);
  log(`Search URL: ${searchUrl}`);
  log(`Filters: ${JSON.stringify(filters)}`);
  log(`Max pages: ${maxPages} | Show browser: ${showBrowser} | Summarize: ${summarize}`);

  const summaryFields = loadSummaryFields(summaryFieldsPath);
  const summarySchema = buildSummarySchema(summaryFields);
  const summarizeLimit = summarizeMax > 0 ? summarizeMax : null;
  let summarizedCount = 0;

  if (summarize) {
    const maxLabel = summarizeLimit ?? "unlimited";
    log(`Summary model: ${summarizeModel} | timeout: ${summarizeTimeout}ms | max: ${maxLabel}`);
  }

  const { browser, page } = await launchStealthBrowser({
    headless: !showBrowser,
  });

  try {
    log("Logging in...");
    const loginStart = Date.now();
    await loginToLinkedIn(page, email, password);
    log(`Logged in in ${((Date.now() - loginStart) / 1000).toFixed(1)}s`);
    await humanDelay(2, 4);

    log("Navigating to search page...");
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    log(`Search page loaded (URL: ${page.url()})`);

    try {
      await page.waitForSelector("ul.jobs-search-results__list", {
        timeout: 15000,
      });
      log("Results list found.");
    } catch {
      log("Results list not found within 15s; continuing.");
    }
    await humanDelay(2, 3);

    const allJobs: ScrapedJob[] = [];
    const seenLinks = new Set<string>();

    for (let pg = 1; pg <= maxPages; pg++) {
      log(`Page ${pg}...`);
      const jobs = await scrapePage(page);
      log(`Found ${jobs.length} job cards`);

      for (const j of jobs) {
        if (seenLinks.has(j.link)) continue;
        seenLinks.add(j.link);

        let enrichedJob = j;
        if (
          summarize &&
          (summarizeLimit === null || summarizedCount < summarizeLimit)
        ) {
          log(
            `Summarizing ${summarizedCount + 1}/${summarizeLimit ?? "unlimited"}: ${j.title}`
          );
          enrichedJob = await enrichJobWithSummary(
            page,
            j,
            summaryFields,
            summarySchema,
            summarizeModel,
            summarizeTimeout,
            log
          );
          summarizedCount++;
          await humanDelay(0.6, 1.4);
        }

        allJobs.push(enrichedJob);
      }

      log(`Total: ${allJobs.length}`);

      if (pg < maxPages) {
        if (!(await goNextPage(page, pg))) {
          log("No more pages.");
          break;
        }
      }
      await humanDelay(3, 7);
    }

    // Deduplicate by link
    const unique = Object.values(
      Object.fromEntries(allJobs.map((j) => [j.link, j]))
    );

    log(`Scraping complete. ${unique.length} unique jobs.`);
    return unique;
  } finally {
    await browser.close();
  }
}
