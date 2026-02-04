"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2, Play } from "lucide-react";

export interface Filters {
  keywords: string;
  location: string;
  remote: boolean;
  experience: string;
  date_posted: string;
  showBrowser: boolean;
}

interface FilterPanelProps {
  onScrape: (filters: Filters, maxPages: number) => void;
  isLoading: boolean;
}

const PRESETS: { label: string; shortcut: string; filters: Filters }[] = [
  {
    label: "Fullstack",
    shortcut: "F1",
    filters: {
      keywords: "fullstack developer Next.js React",
      location: "United States",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
      showBrowser: false,
    },
  },
  {
    label: "AI / ML",
    shortcut: "F2",
    filters: {
      keywords: "AI ML engineer LLM",
      location: "United States",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
      showBrowser: false,
    },
  },
  {
    label: "Cloud",
    shortcut: "F3",
    filters: {
      keywords: "AWS cloud engineer serverless",
      location: "United States",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
      showBrowser: false,
    },
  },
  {
    label: "Frontend",
    shortcut: "F4",
    filters: {
      keywords: "frontend developer React TypeScript",
      location: "Charlotte NC",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
      showBrowser: false,
    },
  },
];

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry" },
  { value: "associate", label: "Associate" },
  { value: "mid-senior", label: "Mid-Senior" },
  { value: "director", label: "Director" },
  { value: "executive", label: "Executive" },
];

const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "24h", label: "24 hours" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

const DEFAULT_FILTERS: Filters = {
  keywords: "fullstack developer Next.js React",
  location: "Charlotte NC",
  remote: true,
  experience: "mid-senior",
  date_posted: "week",
  showBrowser: false,
};

export default function FilterPanel({ onScrape, isLoading }: FilterPanelProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [maxPages, setMaxPages] = useState(5);
  const [loaded, setLoaded] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.keywords !== undefined) {
          setFilters({
            keywords: data.keywords || DEFAULT_FILTERS.keywords,
            location: data.location || DEFAULT_FILTERS.location,
            remote: Boolean(data.remote),
            experience: data.experience || DEFAULT_FILTERS.experience,
            date_posted: data.date_posted || DEFAULT_FILTERS.date_posted,
            showBrowser: Boolean(data.show_browser),
          });
          setMaxPages(data.max_pages || 5);
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const savePreferences = useCallback((f: Filters, mp: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          max_pages: mp,
          show_browser: f.showBrowser,
        }),
      }).catch(() => {});
    }, 500);
  }, []);

  const update = (key: keyof Filters, value: string | boolean) => {
    setActivePreset(null);
    setFilters((f) => {
      const newFilters = { ...f, [key]: value };
      if (loaded) savePreferences(newFilters, maxPages);
      return newFilters;
    });
  };

  const updateMaxPages = (value: number) => {
    setMaxPages(value);
    if (loaded) savePreferences(filters, value);
  };

  const applyPreset = (preset: Filters, label: string) => {
    setFilters(preset);
    setActivePreset(label);
    if (loaded) savePreferences(preset, maxPages);
  };

  const experienceValue = filters.experience || "any";
  const dateValue = filters.date_posted || "any";
  const headless = !filters.showBrowser;

  return (
    <div id="filters" className="cyber-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="terminal-label">SEARCH PARAMETERS</span>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {maxPages} pages
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Presets */}
        <div className="space-y-2">
          <div className="terminal-label">QUICK PRESETS</div>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.filters, p.label)}
                className={cn(
                  "group relative flex items-center justify-between rounded border px-3 py-2 text-left text-xs transition-all",
                  activePreset === p.label
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                <span className="font-medium">{p.label}</span>
                <span className="font-mono text-[9px] text-muted-foreground/50 group-hover:text-muted-foreground">
                  {p.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords" className="terminal-label">
              KEYWORDS
            </Label>
            <Input
              id="keywords"
              type="text"
              value={filters.keywords}
              onChange={(e) => update("keywords", e.target.value)}
              placeholder="e.g. fullstack developer React"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="terminal-label">
              LOCATION
            </Label>
            <Input
              id="location"
              type="text"
              value={filters.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Charlotte NC"
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="terminal-label">LEVEL</Label>
              <Select
                value={experienceValue}
                onValueChange={(value) =>
                  update("experience", value === "any" ? "" : value)
                }
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value || "any"}
                      value={option.value || "any"}
                      className="font-mono text-xs"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="terminal-label">POSTED</Label>
              <Select
                value={dateValue}
                onValueChange={(value) =>
                  update("date_posted", value === "any" ? "" : value)
                }
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value || "any"}
                      value={option.value || "any"}
                      className="font-mono text-xs"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="terminal-label">PAGES</Label>
              <Select
                value={String(maxPages)}
                onValueChange={(value) => updateMaxPages(Number(value))}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="5" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 8, 10].map((value) => (
                    <SelectItem
                      key={value}
                      value={String(value)}
                      className="font-mono text-xs"
                    >
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                id="remote"
                checked={filters.remote}
                onCheckedChange={(value) => update("remote", Boolean(value))}
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Remote positions only
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                id="showBrowser"
                checked={headless}
                onCheckedChange={(value) =>
                  update("showBrowser", !Boolean(value))
                }
              />
              <div className="flex items-center gap-1.5">
                {headless ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground/50" />
                ) : (
                  <Eye className="h-3 w-3 text-primary" />
                )}
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Headless (no window)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Execute Button */}
        <Button
          onClick={() => onScrape(filters, maxPages)}
          disabled={isLoading || !filters.keywords.trim()}
          size="lg"
          className={cn(
            "w-full font-mono text-sm tracking-wider transition-all",
            isLoading && "gradient-border"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              EXECUTING...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              EXECUTE SCRAPE
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
