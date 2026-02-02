"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  Clock,
  Database,
  MapPin,
  Search,
  Trash2,
} from "lucide-react";

interface ScrapeMetadata {
  id: number;
  filters: {
    keywords?: string;
    location?: string;
    remote?: boolean;
    experience?: string;
    date_posted?: string;
  };
  job_count: number;
  scraped_at: string;
}

export default function HistoryPage() {
  const [scrapes, setScrapes] = useState<ScrapeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/scrapes")
      .then((r) => r.json())
      .then((data) => {
        setScrapes(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/scrapes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setScrapes((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const totalJobs = scrapes.reduce((sum, s) => sum + s.job_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Run History</h1>
          <p className="text-sm text-muted-foreground">
            View and manage past scrape runs
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="terminal-label mb-1">TOTAL RUNS</div>
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-lg font-bold text-foreground">
                {scrapes.length}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="text-right">
            <div className="terminal-label mb-1">TOTAL JOBS</div>
            <span className="stat-value text-2xl">{totalJobs}</span>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded shimmer" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && scrapes.length === 0 && (
        <div className="cyber-card">
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Database className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-sm text-muted-foreground">
                No scrape history
              </p>
              <p className="text-xs text-muted-foreground/60">
                Run your first scrape to see it here
              </p>
            </div>
            <Link href="/">
              <Button className="mt-2">Run First Scrape</Button>
            </Link>
          </div>
        </div>
      )}

      {/* History List */}
      {!loading && scrapes.length > 0 && (
        <div className="space-y-3 stagger-in">
          {scrapes.map((scrape, i) => {
            const { date, time } = formatDate(scrape.scraped_at);
            return (
              <div
                key={scrape.id}
                className="cyber-card group hover:border-primary/30 transition-colors"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Side */}
                    <div className="min-w-0 flex-1 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground/50">
                          #{String(scrape.id).padStart(3, "0")}
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="font-mono text-xs">{date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono text-xs">{time}</span>
                        </div>
                      </div>

                      {/* Filters Summary */}
                      <div className="flex flex-wrap items-center gap-2">
                        {scrape.filters.keywords && (
                          <div className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2 py-1">
                            <Search className="h-3 w-3 text-muted-foreground/60" />
                            <span className="font-mono text-[11px]">
                              {scrape.filters.keywords.split(" ").slice(0, 3).join(" ")}
                            </span>
                          </div>
                        )}
                        {scrape.filters.location && (
                          <div className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2 py-1">
                            <MapPin className="h-3 w-3 text-muted-foreground/60" />
                            <span className="font-mono text-[11px]">
                              {scrape.filters.location}
                            </span>
                          </div>
                        )}
                        {scrape.filters.remote && (
                          <div className="rounded border border-primary/30 bg-primary/10 px-2 py-1">
                            <span className="font-mono text-[10px] text-primary">
                              REMOTE
                            </span>
                          </div>
                        )}
                        {scrape.filters.experience && (
                          <div className="rounded border border-border bg-muted/30 px-2 py-1">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {scrape.filters.experience.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Job Count */}
                      <div className="flex items-center gap-2">
                        <span className="stat-value text-xl">{scrape.job_count}</span>
                        <span className="text-xs text-muted-foreground">
                          jobs extracted
                        </span>
                      </div>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(scrape.id)}
                        disabled={deleting === scrape.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Link href={`/history/${scrape.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-mono text-xs"
                        >
                          VIEW
                          <ArrowRight className="ml-1.5 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
