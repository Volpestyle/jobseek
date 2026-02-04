"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FilterPanel, { Filters } from "@/components/FilterPanel";
import { cn } from "@/lib/utils";
import { Activity, Clock, Database, Zap, Terminal, Briefcase } from "lucide-react";

interface ScrapeStats {
  totalJobs: number;
  totalRuns: number;
  lastRun: string | null;
}

interface ScrapedJobPreview {
  title: string;
  company: string;
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
  const [logs, setLogs] = useState<string[]>([]);
  const [foundJobs, setFoundJobs] = useState<ScrapedJobPreview[]>([]);
  const [scrapeId, setScrapeId] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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
      setLogs([]);
      setFoundJobs([]);
      setScrapeId(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters, maxPages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `HTTP ${res.status}`);
          setIsLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream");
          setIsLoading(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(currentEvent, data);
              } catch {
                // Invalid JSON, skip
              }
              currentEvent = "";
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setLogs((prev) => [...prev, "Scrape cancelled"]);
        } else {
          const message = err instanceof Error ? err.message : "Network error";
          setError(message);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  function handleSSEEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case "start":
        setLogs((prev) => [...prev, "Scrape started"]);
        break;
      case "log":
        if (data.message && typeof data.message === "string") {
          // Avoid flooding with tiny deltas — batch text content
          setLogs((prev) => {
            const msg = data.message as string;
            // If the message is very short (a text delta), append to last log
            if (msg.length < 80 && prev.length > 0 && !msg.startsWith("[")) {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              // Only append if last entry isn't a special message
              if (!last.startsWith("Scrape ") && !last.startsWith("[")) {
                updated[updated.length - 1] = last + msg;
                return updated;
              }
            }
            return [...prev, msg];
          });
        }
        break;
      case "tool": {
        const toolName = (data.tool as string) || "unknown";
        const toolType = data.type as string;
        const prefix = toolType === "tool_use" ? ">>>" : "<<<";
        setLogs((prev) => [...prev, `${prefix} ${toolName}`]);
        break;
      }
      case "job": {
        const job = data.job as { title: string; company: string };
        if (job) {
          setFoundJobs((prev) => [...prev, { title: job.title, company: job.company }]);
          setLogs((prev) => [...prev, `[JOB FOUND] ${job.title} @ ${job.company}`]);
        }
        break;
      }
      case "error":
        setError((data.message as string) || "Unknown error");
        break;
      case "complete": {
        const id = data.scrapeId as number | null;
        const count = data.jobCount as number;
        setScrapeId(id);
        setLogs((prev) => [...prev, `Scrape complete: ${count} jobs found`]);
        if (id) {
          // Navigate to results after a short delay
          setTimeout(() => router.push("/results"), 1500);
        }
        break;
      }
    }
  }

  const statusConfig = isLoading
    ? { label: "SCRAPING", class: "badge-active", icon: Activity }
    : error
      ? { label: "ERROR", class: "badge-error", icon: Zap }
      : { label: "READY", class: "badge-ready", icon: Zap };

  const showLivePanel = isLoading || logs.length > 0;

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

        {/* Info / Live Panel */}
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

          {showLivePanel ? (
            <>
              {/* Job Counter */}
              <div className="cyber-card">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="terminal-label">JOBS FOUND</span>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3 text-primary" />
                      <span className="font-mono text-lg font-bold text-foreground">
                        {foundJobs.length}
                      </span>
                    </div>
                  </div>
                </div>
                {foundJobs.length > 0 && (
                  <div className="p-4 max-h-40 overflow-y-auto space-y-1">
                    {foundJobs.map((job, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs font-mono"
                      >
                        <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>
                        <span className="text-foreground truncate">{job.title}</span>
                        <span className="text-muted-foreground truncate">@ {job.company}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Log Panel */}
              <div className="cyber-card">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3 w-3 text-muted-foreground" />
                      <span className="terminal-label">LIVE LOG</span>
                    </div>
                    {isLoading && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        STREAMING
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto bg-black/20">
                  <div className="space-y-0.5 font-mono text-[11px] leading-relaxed">
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        className={cn(
                          "whitespace-pre-wrap break-all",
                          log.startsWith("[JOB FOUND]")
                            ? "text-green-400"
                            : log.startsWith(">>>")
                              ? "text-blue-400"
                              : log.startsWith("<<<")
                                ? "text-cyan-400"
                                : log.startsWith("[thinking]")
                                  ? "text-muted-foreground/50"
                                  : log.startsWith("Scrape complete")
                                    ? "text-green-400 font-bold"
                                    : "text-muted-foreground"
                        )}
                      >
                        {log}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>

              {scrapeId && (
                <div className="cyber-card border-primary/30 bg-primary/5">
                  <div className="p-4 text-center">
                    <p className="font-mono text-sm text-primary">
                      Redirecting to results...
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
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
                        Claude controls a browser via MCP tools to scrape and summarize jobs
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
                    <span className="text-primary font-mono">Headless</span> — Disable
                    this if LinkedIn shows a CAPTCHA so you can solve it manually.
                  </p>
                  <p>
                    <span className="text-primary font-mono">Max Pages</span> — Each page
                    contains ~25 job listings.
                  </p>
                  <p>
                    <span className="text-primary font-mono">Remote Filter</span> — Filters
                    to "Remote" work type only on LinkedIn.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
