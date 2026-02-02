"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import JobTable, { Job } from "@/components/JobTable";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Database,
  MapPin,
  Search,
} from "lucide-react";

interface ScrapeRecord {
  id: number;
  filters: {
    keywords?: string;
    location?: string;
    remote?: boolean;
    experience?: string;
    date_posted?: string;
  };
  jobs: Job[];
  job_count: number;
  scraped_at: string;
  logs: string | null;
}

export default function HistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [scrape, setScrape] = useState<ScrapeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/scrapes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Scrape not found");
        return r.json();
      })
      .then((data) => {
        setScrape(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded shimmer" />
          <div className="h-8 w-48 rounded shimmer" />
        </div>
        <div className="cyber-card">
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="font-mono text-sm text-muted-foreground">
              Loading run data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scrape) {
    return (
      <div className="space-y-6">
        <BreadcrumbNav
          items={[
            { label: "HISTORY", href: "/history" },
            { label: `RUN #${id?.toString().padStart(3, "0") || "???"}` },
          ]}
        />
        <div className="cyber-card border-destructive/50 bg-destructive/5">
          <div className="flex flex-col items-center gap-4 p-8">
            <Database className="h-10 w-10 text-destructive/60" />
            <p className="font-mono text-sm text-destructive">
              {error || "Run not found"}
            </p>
            <Link href="/history">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { date, time } = formatDate(scrape.scraped_at);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: "HISTORY", href: "/history" },
          { label: `RUN #${String(scrape.id).padStart(3, "0")}` },
        ]}
      />

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Link href="/history">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-medium tracking-tight">
              Run #{String(scrape.id).padStart(3, "0")}
            </h1>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 ml-11">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="font-mono text-xs">{date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-xs">{time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="stat-value text-lg">{scrape.job_count}</span>
              <span className="text-xs text-muted-foreground">jobs</span>
            </div>
          </div>
        </div>

        {/* Filters Summary */}
        <div className="flex flex-wrap items-center gap-2">
          {scrape.filters.keywords && (
            <div className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2.5 py-1">
              <Search className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-[11px] text-foreground">
                {scrape.filters.keywords.split(" ").slice(0, 3).join(" ")}
              </span>
            </div>
          )}
          {scrape.filters.location && (
            <div className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2.5 py-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-[11px] text-foreground">
                {scrape.filters.location}
              </span>
            </div>
          )}
          {scrape.filters.remote && (
            <div className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1">
              <span className="font-mono text-[11px] text-primary">REMOTE</span>
            </div>
          )}
          {scrape.filters.experience && (
            <div className="rounded border border-border bg-muted/30 px-2.5 py-1">
              <span className="font-mono text-[10px] text-muted-foreground">
                {scrape.filters.experience.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Job Table */}
      <JobTable
        jobs={scrape.jobs}
        scrapedAt={scrape.scraped_at}
        isLoading={false}
        error={null}
        logs={scrape.logs}
      />
    </div>
  );
}
