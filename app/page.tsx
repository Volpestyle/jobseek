"use client";

import { CSSProperties, useCallback, useEffect, useState } from "react";
import FilterPanel, { Filters } from "@/components/FilterPanel";
import JobTable, { Job } from "@/components/JobTable";
import ScrapeHistory from "@/components/ScrapeHistory";

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapedAt, setScrapedAt] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [currentScrapeId, setCurrentScrapeId] = useState<number | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  // Load latest scrape on mount
  useEffect(() => {
    fetch("/api/scrape")
      .then((r) => r.json())
      .then((data) => {
        if (data.jobs?.length) {
          setJobs(data.jobs);
          setScrapedAt(data.scrapedAt || null);
          setCurrentScrapeId(data.id || null);
        }
      })
      .catch(() => {});
  }, []);

  const handleScrape = useCallback(
    async (filters: Filters, maxPages: number) => {
      setIsLoading(true);
      setError(null);
      setLogs(null);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters, maxPages }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `HTTP ${res.status}`);
          if (data.details) setLogs(data.details);
          return;
        }

        setJobs(data.jobs || []);
        setScrapedAt(data.scrapedAt || new Date().toISOString());
        setCurrentScrapeId(data.id || null);
        if (data.logs) setLogs(data.logs);
        // Refresh history list
        setHistoryKey((k) => k + 1);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSelectScrape = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/scrapes/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
      setScrapedAt(data.scraped_at || null);
      setCurrentScrapeId(data.id);
      setLogs(data.logs || null);
      setError(null);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div style={styles.page}>
      {/* Subtle grid background */}
      <div style={styles.gridBg} />

      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>◆</span>
            <span style={styles.logoText}>JobScraper</span>
          </div>
          <span style={styles.badge}>STEALTH</span>
        </div>
        <p style={styles.subtitle}>
          LinkedIn job search powered by Playwright · burner account ·
          anti-detection
        </p>
      </header>

      <main style={styles.main}>
        <aside style={styles.sidebar}>
          <FilterPanel onScrape={handleScrape} isLoading={isLoading} />

          {/* Status card */}
          <div style={styles.statusCard}>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Status</span>
              <span
                style={{
                  ...styles.statusDot,
                  background: isLoading
                    ? "var(--warning)"
                    : error
                    ? "var(--danger)"
                    : "var(--accent)",
                  boxShadow: `0 0 8px ${
                    isLoading
                      ? "var(--warning)"
                      : error
                      ? "var(--danger)"
                      : "var(--accent)"
                  }`,
                }}
              />
              <span style={styles.statusText}>
                {isLoading ? "Scraping" : error ? "Error" : "Ready"}
              </span>
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Jobs found</span>
              <span style={styles.statusValue}>{jobs.length}</span>
            </div>
            {scrapedAt && (
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Last run</span>
                <span style={styles.statusValue}>
                  {new Date(scrapedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Scrape history */}
          <ScrapeHistory
            key={historyKey}
            onSelect={handleSelectScrape}
            currentScrapeId={currentScrapeId}
          />
        </aside>

        <section style={styles.content}>
          <JobTable
            jobs={jobs}
            scrapedAt={scrapedAt}
            isLoading={isLoading}
            error={error}
            logs={logs}
          />
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
  },
  gridBg: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
    opacity: 0.15,
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    position: "relative",
    zIndex: 1,
    padding: "32px 40px 0",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "8px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    fontSize: "20px",
    color: "var(--accent)",
  },
  logoText: {
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "-0.04em",
    color: "var(--text-primary)",
  },
  badge: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "var(--accent)",
    background: "var(--accent-dim)",
    padding: "3px 10px",
    borderRadius: "20px",
    border: "1px solid var(--accent)",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--text-tertiary)",
    fontFamily: "var(--font-mono)",
  },
  main: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: "28px",
    padding: "28px 40px 60px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  sidebar: {
    width: "360px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    position: "sticky",
    top: "28px",
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  statusCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statusLabel: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-tertiary)",
    width: "80px",
    flexShrink: 0,
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
  },
  statusValue: {
    fontSize: "13px",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
  },
};
