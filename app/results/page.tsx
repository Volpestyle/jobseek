"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import JobTable, { Job } from "@/components/JobTable";
import ChatInterface from "@/components/ChatInterface";
import KanbanBoard from "@/components/KanbanBoard";
import { TabNav } from "@/components/tab-nav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Database,
  Layers,
  Search,
} from "lucide-react";
import type { KanbanCardData } from "@/components/KanbanCard";
import type { PipelineStage, HydratedPipelineEntry } from "@/lib/pipeline-types";

interface AccumulatedData {
  jobs: Job[];
  runIds: number[];
  totalBeforeDedup: number;
  dateRange: { from: string; to: string };
}

const RUN_COUNT_OPTIONS = [
  { value: "1", label: "Last run" },
  { value: "3", label: "Last 3 runs" },
  { value: "5", label: "Last 5 runs" },
  { value: "10", label: "Last 10 runs" },
  { value: "all", label: "All runs" },
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  interested: "INTERESTED",
  applied: "APPLIED",
  interview: "INTERVIEW",
  offer: "OFFER",
  rejected: "REJECTED",
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCount = searchParams.get("count") || "5";
  const initialTab = searchParams.get("tab") || "pipeline";

  const [runCount, setRunCount] = useState(initialCount);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [data, setData] = useState<AccumulatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [pipelineEntries, setPipelineEntries] = useState<KanbanCardData[]>([]);
  const [pipelineLinks, setPipelineLinks] = useState<Set<string>>(new Set());

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) return;
      const result = await res.json() as { entries: HydratedPipelineEntry[] };
      const cards: KanbanCardData[] = result.entries.map((e) => ({
        link: e.pipeline.link,
        stage: e.pipeline.stage as PipelineStage,
        notes: e.pipeline.notes,
        added_at: e.pipeline.added_at,
        updated_at: e.pipeline.updated_at,
        job: e.job,
      }));
      setPipelineEntries(cards);
      setPipelineLinks(new Set(cards.map((c) => c.link)));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/scrapes/accumulated?count=${runCount}`);
        if (!res.ok) throw new Error("Failed to load results");
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [runCount]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleRunCountChange = (value: string) => {
    setRunCount(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("count", value);
    router.push(`/results?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`/results?${params.toString()}`, { scroll: false });
  };

  const formatDateRange = (from: string, to: string) => {
    if (!from || !to) return null;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const format = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (from === to) return format(fromDate);
    return `${format(fromDate)} - ${format(toDate)}`;
  };

  const handleApply = (job: Job) => {
    const jobIndex = data?.jobs.indexOf(job);
    const num = jobIndex !== undefined && jobIndex >= 0 ? jobIndex + 1 : "?";
    setPendingMessage(`Apply to job #${num} - ${job.title} at ${job.company}`);
    handleTabChange("chat");
  };

  const handleAddToPipeline = async (job: Job) => {
    // Optimistic
    setPipelineLinks((prev) => new Set([...prev, job.link]));

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: job.link, stage: "interested" }),
      });
      if (!res.ok) throw new Error("Failed to add");
      fetchPipeline();
    } catch {
      setPipelineLinks((prev) => {
        const next = new Set(prev);
        next.delete(job.link);
        return next;
      });
    }
  };

  // Pipeline stage counts
  const stageCounts = pipelineEntries.reduce(
    (acc, e) => {
      acc[e.stage] = (acc[e.stage] || 0) + 1;
      return acc;
    },
    {} as Record<PipelineStage, number>
  );

  const tabs = [
    { id: "pipeline", label: "PIPELINE" },
    { id: "jobs", label: "JOBS" },
    { id: "chat", label: "CHAT" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-medium tracking-tight">Pipeline</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Track jobs through your application pipeline
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {activeTab === "jobs" && (
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={runCount} onValueChange={handleRunCountChange}>
                <SelectTrigger className="w-[140px] h-8 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_COUNT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="font-mono text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* Stats bar */}
      {activeTab === "pipeline" && (
        <div className="cyber-card">
          <div className="flex flex-wrap items-center gap-6 px-4 py-3">
            {(Object.keys(STAGE_LABELS) as PipelineStage[]).map((stage) => (
              <div key={stage}>
                <div className="terminal-label mb-0.5">{STAGE_LABELS[stage]}</div>
                <span className="font-mono text-sm font-bold">
                  {stageCounts[stage] || 0}
                </span>
              </div>
            ))}
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="terminal-label mb-0.5">TOTAL</div>
              <span className="stat-value text-xl">{pipelineEntries.length}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "jobs" && data && !loading && (
        <div className="cyber-card">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-6">
              <div>
                <div className="terminal-label mb-0.5">UNIQUE JOBS</div>
                <span className="stat-value text-xl">{data.jobs.length}</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="terminal-label mb-0.5">FROM RUNS</div>
                <div className="flex items-center gap-1.5">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-sm font-bold">
                    {data.runIds.length}
                  </span>
                </div>
              </div>
              {data.totalBeforeDedup > data.jobs.length && (
                <>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <div className="terminal-label mb-0.5">DUPLICATES REMOVED</div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {data.totalBeforeDedup - data.jobs.length}
                    </span>
                  </div>
                </>
              )}
            </div>
            {data.dateRange.from && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="font-mono text-xs">
                  {formatDateRange(data.dateRange.from, data.dateRange.to)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Loading State */}
      {loading && activeTab !== "pipeline" && (
        <div className="cyber-card">
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="font-mono text-sm text-muted-foreground">
              Loading accumulated results...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && activeTab !== "pipeline" && (
        <div className="cyber-card border-destructive/50 bg-destructive/5">
          <div className="flex flex-col items-center gap-4 p-8">
            <p className="font-mono text-sm text-destructive">{error}</p>
            <Link href="/">
              <Button variant="outline" size="sm">
                Run New Scrape
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      <div className={activeTab === "pipeline" ? "" : "hidden"}>
        <KanbanBoard entries={pipelineEntries} onRefresh={fetchPipeline} />
      </div>

      {/* Jobs Tab */}
      <div className={activeTab === "jobs" ? "" : "hidden"}>
        {!loading && !error && (
          <>
            {data && data.jobs.length === 0 ? (
              <div className="cyber-card">
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-7 w-7 text-primary/60" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-sm text-muted-foreground">
                      No jobs found
                    </p>
                    <p className="text-xs text-muted-foreground/60 max-w-sm">
                      Run a scrape from the main page to see results here
                    </p>
                  </div>
                  <Link href="/">
                    <Button className="mt-2">Configure Scrape</Button>
                  </Link>
                </div>
              </div>
            ) : (
              data && (
                <JobTable
                  jobs={data.jobs}
                  scrapedAt={data.dateRange.to}
                  isLoading={false}
                  error={null}
                  logs={null}
                  onSearchChange={setSearchFilter}
                  onApply={handleApply}
                  onAddToPipeline={handleAddToPipeline}
                  pipelineLinks={pipelineLinks}
                />
              )
            )}
          </>
        )}
      </div>

      {/* Chat Tab - always mounted to preserve state */}
      <div className={activeTab === "chat" ? "" : "hidden"}>
        {!loading && !error && data && (
          <ChatInterface
            jobs={data.jobs}
            searchFilter={searchFilter}
            pendingMessage={pendingMessage}
            onPendingMessageConsumed={() => setPendingMessage("")}
          />
        )}
      </div>

    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded shimmer" />
            <div className="h-6 w-24 rounded shimmer" />
          </div>
          <div className="h-4 w-48 rounded shimmer ml-11" />
        </div>
      </header>
      <div className="cyber-card">
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-mono text-sm text-muted-foreground">
            Loading results...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultsContent />
    </Suspense>
  );
}
