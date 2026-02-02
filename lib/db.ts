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

export default db;
