import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "jobseek.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    keywords TEXT,
    location TEXT,
    remote INTEGER,
    experience TEXT,
    date_posted TEXT,
    max_pages INTEGER DEFAULT 5,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS scrapes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filters TEXT NOT NULL,
    jobs TEXT NOT NULL,
    job_count INTEGER NOT NULL,
    scraped_at TEXT NOT NULL,
    logs TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export interface Preferences {
  keywords: string;
  location: string;
  remote: boolean;
  experience: string;
  date_posted: string;
  max_pages: number;
}

export interface ScrapeRecord {
  id: number;
  filters: Record<string, unknown>;
  jobs: unknown[];
  job_count: number;
  scraped_at: string;
  logs: string | null;
}

export interface ScrapeMetadata {
  id: number;
  filters: Record<string, unknown>;
  job_count: number;
  scraped_at: string;
}

// Preferences functions
export function getPreferences(): Preferences | null {
  const row = db.prepare("SELECT * FROM preferences WHERE id = 1").get() as {
    keywords: string | null;
    location: string | null;
    remote: number | null;
    experience: string | null;
    date_posted: string | null;
    max_pages: number | null;
  } | undefined;

  if (!row) return null;

  return {
    keywords: row.keywords || "",
    location: row.location || "",
    remote: Boolean(row.remote),
    experience: row.experience || "",
    date_posted: row.date_posted || "",
    max_pages: row.max_pages || 5,
  };
}

export function savePreferences(prefs: Preferences): void {
  const stmt = db.prepare(`
    INSERT INTO preferences (id, keywords, location, remote, experience, date_posted, max_pages, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      keywords = excluded.keywords,
      location = excluded.location,
      remote = excluded.remote,
      experience = excluded.experience,
      date_posted = excluded.date_posted,
      max_pages = excluded.max_pages,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    prefs.keywords,
    prefs.location,
    prefs.remote ? 1 : 0,
    prefs.experience,
    prefs.date_posted,
    prefs.max_pages,
    new Date().toISOString()
  );
}

// Scrape functions
export function getScrapes(): ScrapeMetadata[] {
  const rows = db
    .prepare(
      "SELECT id, filters, job_count, scraped_at FROM scrapes ORDER BY scraped_at DESC"
    )
    .all() as { id: number; filters: string; job_count: number; scraped_at: string }[];

  return rows.map((row) => ({
    id: row.id,
    filters: JSON.parse(row.filters),
    job_count: row.job_count,
    scraped_at: row.scraped_at,
  }));
}

export function getScrape(id: number): ScrapeRecord | null {
  const row = db.prepare("SELECT * FROM scrapes WHERE id = ?").get(id) as {
    id: number;
    filters: string;
    jobs: string;
    job_count: number;
    scraped_at: string;
    logs: string | null;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    filters: JSON.parse(row.filters),
    jobs: JSON.parse(row.jobs),
    job_count: row.job_count,
    scraped_at: row.scraped_at,
    logs: row.logs,
  };
}

export function getLatestScrape(): ScrapeRecord | null {
  const row = db
    .prepare("SELECT * FROM scrapes ORDER BY scraped_at DESC LIMIT 1")
    .get() as {
    id: number;
    filters: string;
    jobs: string;
    job_count: number;
    scraped_at: string;
    logs: string | null;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    filters: JSON.parse(row.filters),
    jobs: JSON.parse(row.jobs),
    job_count: row.job_count,
    scraped_at: row.scraped_at,
    logs: row.logs,
  };
}

export function saveScrape(
  filters: Record<string, unknown>,
  jobs: unknown[],
  logs: string | null
): number {
  const stmt = db.prepare(`
    INSERT INTO scrapes (filters, jobs, job_count, scraped_at, logs)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    JSON.stringify(filters),
    JSON.stringify(jobs),
    jobs.length,
    new Date().toISOString(),
    logs
  );

  return result.lastInsertRowid as number;
}

export function deleteScrape(id: number): boolean {
  const result = db.prepare("DELETE FROM scrapes WHERE id = ?").run(id);
  return result.changes > 0;
}

export interface Job {
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

export interface AccumulatedJobsResult {
  jobs: Job[];
  runIds: number[];
  totalBeforeDedup: number;
  dateRange: { from: string; to: string };
}

export function getAccumulatedJobs(count: number | "all"): AccumulatedJobsResult {
  const query =
    count === "all"
      ? "SELECT id, jobs, scraped_at FROM scrapes ORDER BY scraped_at DESC"
      : "SELECT id, jobs, scraped_at FROM scrapes ORDER BY scraped_at DESC LIMIT ?";

  const rows =
    count === "all"
      ? (db.prepare(query).all() as { id: number; jobs: string; scraped_at: string }[])
      : (db.prepare(query).all(count) as { id: number; jobs: string; scraped_at: string }[]);

  if (rows.length === 0) {
    return {
      jobs: [],
      runIds: [],
      totalBeforeDedup: 0,
      dateRange: { from: "", to: "" },
    };
  }

  const runIds: number[] = [];
  const allJobs: Job[] = [];
  const seenLinks = new Set<string>();

  for (const row of rows) {
    runIds.push(row.id);
    const jobs = JSON.parse(row.jobs) as Job[];
    for (const job of jobs) {
      allJobs.push(job);
    }
  }

  const totalBeforeDedup = allJobs.length;

  // Deduplicate by link URL (keep first occurrence - most recent)
  const dedupedJobs: Job[] = [];
  for (const job of allJobs) {
    if (!seenLinks.has(job.link)) {
      seenLinks.add(job.link);
      dedupedJobs.push(job);
    }
  }

  // Date range (oldest to newest scraped_at)
  const dates = rows.map((r) => r.scraped_at);
  const from = dates[dates.length - 1] || "";
  const to = dates[0] || "";

  return {
    jobs: dedupedJobs,
    runIds,
    totalBeforeDedup,
    dateRange: { from, to },
  };
}

// Chat preferences functions
export interface ChatPreference {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export function getChatPreferences(): ChatPreference[] {
  const rows = db
    .prepare("SELECT * FROM chat_preferences ORDER BY updated_at DESC")
    .all() as ChatPreference[];
  return rows;
}

export function saveChatPreference(
  question: string,
  answer: string,
  category: string | null
): number {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO chat_preferences (question, answer, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(question, answer, category, now, now);
  return result.lastInsertRowid as number;
}

export function updateChatPreference(
  id: number,
  answer: string
): boolean {
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE chat_preferences SET answer = ?, updated_at = ? WHERE id = ?")
    .run(answer, now, id);
  return result.changes > 0;
}

export function deleteChatPreference(id: number): boolean {
  const result = db.prepare("DELETE FROM chat_preferences WHERE id = ?").run(id);
  return result.changes > 0;
}

export default db;
