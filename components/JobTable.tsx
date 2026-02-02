"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Download,
  FileJson,
  Loader2,
  Play,
  Search,
  Terminal,
} from "lucide-react";

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

interface JobTableProps {
  jobs: Job[];
  scrapedAt: string | null;
  isLoading: boolean;
  error: string | null;
  logs: string | null;
  onSearchChange?: (search: string) => void;
  onApply?: (job: Job) => void;
}

export default function JobTable({
  jobs,
  scrapedAt,
  isLoading,
  error,
  logs,
  onSearchChange,
  onApply,
}: JobTableProps) {
  const [search, setSearch] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatFieldLabel = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      (j.salary && j.salary.toLowerCase().includes(q)) ||
      (j.summary && j.summary.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    const header = "Title,Company,Location,Salary,Posted,Link";
    const rows = filtered.map(
      (j) =>
        `"${j.title}","${j.company}","${j.location}","${j.salary || ""}","${j.posted || ""}","${j.link}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkedin-jobs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkedin-jobs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="cyber-card">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="terminal-label">OUTPUT</span>
                {jobs.length > 0 && (
                  <span className="font-mono text-xs text-primary">
                    [{filtered.length}/{jobs.length}]
                  </span>
                )}
              </div>
              {scrapedAt && (
                <div className="font-mono text-[10px] text-muted-foreground/60 mt-0.5">
                  {new Date(scrapedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {jobs.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  type="text"
                  placeholder="Filter..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-8 w-40 pl-8 font-mono text-xs"
                />
              </div>
            )}
            {jobs.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                  className="h-8 font-mono text-[10px] tracking-wider"
                >
                  <Download className="mr-1.5 h-3 w-3" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportJSON}
                  className="h-8 font-mono text-[10px] tracking-wider"
                >
                  <FileJson className="mr-1.5 h-3 w-3" />
                  JSON
                </Button>
              </>
            )}
            {logs && (
              <Button
                variant={showLogs ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
                className="h-8 font-mono text-[10px] tracking-wider"
              >
                <Terminal className="mr-1.5 h-3 w-3" />
                {showLogs ? "HIDE" : "LOGS"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="cyber-card border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="terminal-label text-destructive">
                EXECUTION FAILED
              </div>
              <p className="font-mono text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs Panel */}
      {showLogs && logs && (
        <div className="cyber-card">
          <div className="border-b border-border px-4 py-2">
            <span className="terminal-label">EXECUTION LOG</span>
          </div>
          <div className="p-4">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground leading-relaxed">
              {logs}
            </pre>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="cyber-card gradient-border">
          <div className="flex items-center gap-4 p-6">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-primary/20" />
            </div>
            <div className="space-y-1">
              <div className="font-mono text-sm font-medium text-primary">
                Executing stealth scrape
                <span className="cursor-blink" />
              </div>
              <p className="text-xs text-muted-foreground">
                Mimicking human behavior with randomized delays...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && !error && (
        <div className="cyber-card">
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-7 w-7 text-primary/60" />
              </div>
              <div className="absolute inset-0 rounded-full animate-pulse bg-primary/5" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-sm text-muted-foreground">
                No results yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Configure filters and execute a scrape to begin
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {filtered.length > 0 && (
        <div className="space-y-2 stagger-in">
          {filtered.map((job, i) => (
            <div
              key={job.link || i}
              className="group cyber-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Title Row */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground/40 mt-1 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                      >
                        {job.title}
                      </a>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <span className="font-mono text-xs text-primary/80">
                          {job.company}
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="text-xs text-muted-foreground">
                          {job.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Meta Tags */}
                  {(job.salary || job.posted) && (
                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      {job.salary && (
                        <span className="inline-flex items-center rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary">
                          {job.salary}
                        </span>
                      )}
                      {job.posted && (
                        <span className="inline-flex items-center rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {job.posted}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {(job.summary ||
                    (job.extracted &&
                      Object.values(job.extracted).some((value) =>
                        Array.isArray(value)
                          ? value.length > 0
                          : value !== null && value !== ""
                      ))) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(job.link || String(i))}
                      className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px]"
                    >
                      DETAILS
                      {expanded[job.link || String(i)] ? (
                        <ChevronUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ChevronDown className="ml-1 h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {onApply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onApply(job)}
                      className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px]"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      APPLY
                    </Button>
                  )}
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/30 hover:text-primary transition-colors"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {expanded[job.link || String(i)] && (
                <div className="mt-3 border-t border-border/60 pt-3 space-y-3">
                  {job.summary && (
                    <div className="space-y-1">
                      <div className="terminal-label">SUMMARY</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {job.summary}
                      </p>
                    </div>
                  )}

                  {job.extracted && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(job.extracted)
                        .filter(([, value]) =>
                          Array.isArray(value)
                            ? value.length > 0
                            : value !== null && value !== ""
                        )
                        .map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <div className="terminal-label">{formatFieldLabel(key)}</div>
                            {Array.isArray(value) ? (
                              <div className="flex flex-wrap gap-2">
                                {value.map((item) => (
                                  <span
                                    key={item}
                                    className="inline-flex items-center rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">{value}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
