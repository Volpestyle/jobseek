"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Database, Trash2 } from "lucide-react";

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

interface ScrapeHistoryProps {
  onSelect: (id: number) => void;
  currentScrapeId: number | null;
}

export default function ScrapeHistory({
  onSelect,
  currentScrapeId,
}: ScrapeHistoryProps) {
  const [scrapes, setScrapes] = useState<ScrapeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchScrapes = async () => {
    try {
      const res = await fetch("/api/scrapes");
      if (res.ok) {
        const data = await res.json();
        setScrapes(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapes();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
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
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const summarizeFilters = (filters: ScrapeMetadata["filters"]) => {
    const parts: string[] = [];
    if (filters.keywords) {
      const words = filters.keywords.split(" ").slice(0, 2).join(" ");
      parts.push(words);
    }
    if (filters.location) {
      parts.push(filters.location);
    }
    return parts.join(" · ") || "No filters";
  };

  return (
    <div id="history" className="cyber-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="terminal-label">RUN HISTORY</span>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {scrapes.length} runs
          </span>
        </div>
      </div>

      <div className="p-3">
        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded shimmer" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && scrapes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Database className="h-6 w-6 text-muted-foreground/30" />
            <p className="font-mono text-xs text-muted-foreground/60">
              No runs recorded
            </p>
          </div>
        )}

        {/* List */}
        {!loading && scrapes.length > 0 && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {scrapes.map((scrape, i) => {
              const isActive = currentScrapeId === scrape.id;
              return (
                <div
                  key={scrape.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(scrape.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(scrape.id);
                    }
                  }}
                  className={cn(
                    "group flex items-start justify-between gap-3 rounded border p-3 text-left transition-all cursor-pointer",
                    isActive
                      ? "border-primary/40 bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-muted/30",
                    "stagger-in"
                  )}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground/40">
                        #{String(scrape.id).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs font-medium",
                          isActive ? "text-primary" : "text-foreground"
                        )}
                      >
                        {summarizeFilters(scrape.filters)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(scrape.scraped_at)}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {scrape.job_count} jobs
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(scrape.id, e)}
                    disabled={deleting === scrape.id}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
