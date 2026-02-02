"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FilterPanel, { Filters } from "@/components/FilterPanel";
import { cn } from "@/lib/utils";
import { Activity, Clock, Database, Zap } from "lucide-react";

interface ScrapeStats {
  totalJobs: number;
  totalRuns: number;
  lastRun: string | null;
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ScrapeStats>({
    totalJobs: 0,
    totalRuns: 0,
    lastRun: null,
  });

  // Load stats on mount
  useEffect(() => {
    Promise.all([fetch("/api/scrape"), fetch("/api/scrapes")])
      .then(async ([latestRes, historyRes]) => {
        const latest = await latestRes.json();
        const history = await historyRes.json();

        setStats({
          totalJobs: latest.jobs?.length || 0,
          totalRuns: Array.isArray(history) ? history.length : 0,
          lastRun: latest.scrapedAt || null,
        });
      })
      .catch(() => {});
  }, []);

  const handleScrape = useCallback(
    async (filters: Filters, maxPages: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters, maxPages }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `HTTP ${res.status}`);
          return;
        }

        // Redirect to results page after successful scrape
        router.push("/results");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const statusConfig = isLoading
    ? { label: "SCRAPING", class: "badge-active", icon: Activity }
    : error
      ? { label: "ERROR", class: "badge-error", icon: Zap }
      : { label: "READY", class: "badge-ready", icon: Zap };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">
            Execute Scrape
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure search parameters and run a stealth extraction
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="terminal-label mb-1">STATUS</div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] font-medium",
                statusConfig.class
              )}
            >
              <statusConfig.icon className="h-3 w-3" />
              {statusConfig.label}
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="text-right">
            <div className="terminal-label mb-1">TOTAL RUNS</div>
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-lg font-bold text-foreground">
                {stats.totalRuns}
              </span>
            </div>
          </div>

          {stats.lastRun && (
            <>
              <div className="h-8 w-px bg-border" />
              <div className="text-right">
                <div className="terminal-label mb-1">LAST RUN</div>
                <div className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(stats.lastRun).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
        {/* Filter Panel */}
        <div className="stagger-in">
          <FilterPanel onScrape={handleScrape} isLoading={isLoading} />
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="cyber-card border-destructive/50 bg-destructive/5">
              <div className="flex items-start gap-3 p-4">
                <Zap className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="terminal-label text-destructive">
                    EXECUTION FAILED
                  </div>
                  <p className="font-mono text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="cyber-card">
            <div className="border-b border-border px-4 py-3">
              <span className="terminal-label">HOW IT WORKS</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <span className="font-mono text-xs text-primary">01</span>
                <div>
                  <div className="text-sm font-medium">Configure Filters</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set keywords, location, experience level, and other parameters
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-primary">02</span>
                <div>
                  <div className="text-sm font-medium">Execute Scrape</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Playwright launches a stealth browser session with anti-detection
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-primary">03</span>
                <div>
                  <div className="text-sm font-medium">Review Results</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Jobs are stored locally and can be exported as CSV/JSON
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="cyber-card">
            <div className="border-b border-border px-4 py-3">
              <span className="terminal-label">TIPS</span>
            </div>
            <div className="p-4 space-y-3 text-xs text-muted-foreground">
              <p>
                <span className="text-primary font-mono">Show Browser</span> — Enable
                this if LinkedIn shows a CAPTCHA. You can solve it manually.
              </p>
              <p>
                <span className="text-primary font-mono">Max Pages</span> — Each page
                adds ~30 seconds. Start with 2-3 for testing.
              </p>
              <p>
                <span className="text-primary font-mono">Remote Filter</span> — Filters
                to "Remote" work type only on LinkedIn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
