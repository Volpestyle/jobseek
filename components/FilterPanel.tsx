"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";

export interface Filters {
  keywords: string;
  location: string;
  remote: boolean;
  experience: string;
  date_posted: string;
}

interface FilterPanelProps {
  onScrape: (filters: Filters, maxPages: number) => void;
  isLoading: boolean;
}

const PRESETS: { label: string; filters: Filters }[] = [
  {
    label: "Fullstack (Remote)",
    filters: {
      keywords: "fullstack developer Next.js React",
      location: "United States",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
    },
  },
  {
    label: "AI / ML Engineer",
    filters: {
      keywords: "AI ML engineer LLM",
      location: "United States",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
    },
  },
  {
    label: "AWS / Cloud",
    filters: {
      keywords: "AWS cloud engineer serverless",
      location: "United States",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
    },
  },
  {
    label: "Frontend",
    filters: {
      keywords: "frontend developer React TypeScript",
      location: "Charlotte NC",
      remote: true,
      experience: "mid-senior",
      date_posted: "week",
    },
  },
];

const EXPERIENCE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry Level" },
  { value: "associate", label: "Associate" },
  { value: "mid-senior", label: "Mid-Senior" },
  { value: "director", label: "Director" },
  { value: "executive", label: "Executive" },
];

const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "24h", label: "Past 24 hours" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

const DEFAULT_FILTERS: Filters = {
  keywords: "fullstack developer Next.js React",
  location: "Charlotte NC",
  remote: true,
  experience: "mid-senior",
  date_posted: "week",
};

export default function FilterPanel({ onScrape, isLoading }: FilterPanelProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [maxPages, setMaxPages] = useState(5);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences on mount
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
          });
          setMaxPages(data.max_pages || 5);
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  // Debounced save
  const savePreferences = useCallback((f: Filters, mp: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, max_pages: mp }),
      }).catch(() => {});
    }, 500);
  }, []);

  const update = (key: keyof Filters, value: string | boolean) => {
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

  const applyPreset = (preset: Filters) => {
    setFilters(preset);
    if (loaded) savePreferences(preset, maxPages);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.dot} />
          <h2 style={styles.title}>Search Filters</h2>
        </div>
      </div>

      {/* Presets */}
      <div style={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.filters)}
            style={styles.presetBtn}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "var(--accent-dim)";
              (e.target as HTMLElement).style.borderColor = "var(--accent)";
              (e.target as HTMLElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "var(--tag-bg)";
              (e.target as HTMLElement).style.borderColor = "var(--border)";
              (e.target as HTMLElement).style.color = "var(--tag-text)";
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={styles.fields}>
        <div style={styles.field}>
          <label style={styles.label}>Keywords</label>
          <input
            style={styles.input}
            type="text"
            value={filters.keywords}
            onChange={(e) => update("keywords", e.target.value)}
            placeholder="e.g. fullstack developer React"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <input
            style={styles.input}
            type="text"
            value={filters.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. Charlotte NC"
          />
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Experience</label>
            <select
              style={styles.select}
              value={filters.experience}
              onChange={(e) => update("experience", e.target.value)}
            >
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Posted</label>
            <select
              style={styles.select}
              value={filters.date_posted}
              onChange={(e) => update("date_posted", e.target.value)}
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Max Pages</label>
            <select
              style={styles.select}
              value={maxPages}
              onChange={(e) => updateMaxPages(Number(e.target.value))}
            >
              {[1, 2, 3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.checkboxRow}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={filters.remote}
              onChange={(e) => update("remote", e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>Remote only</span>
          </label>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={() => onScrape(filters, maxPages)}
        disabled={isLoading || !filters.keywords.trim()}
        style={{
          ...styles.runBtn,
          opacity: isLoading || !filters.keywords.trim() ? 0.5 : 1,
        }}
      >
        {isLoading ? (
          <span style={styles.loadingText}>
            <span style={styles.spinner} />
            Scraping...
          </span>
        ) : (
          <>
            <span style={{ fontSize: "18px" }}>⚡</span>
            Run Scrape
          </>
        )}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 8px var(--accent)",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  presets: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  presetBtn: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 500,
    background: "var(--tag-bg)",
    color: "var(--tag-text)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    transition: "all var(--transition)",
    letterSpacing: "0.01em",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--text-tertiary)",
  },
  input: {
    padding: "10px 14px",
    fontSize: "14px",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    transition: "border-color var(--transition)",
  },
  select: {
    padding: "10px 14px",
    fontSize: "14px",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    appearance: "none" as const,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    gap: "12px",
  },
  checkboxRow: {
    paddingTop: "4px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    accentColor: "var(--accent)",
    cursor: "pointer",
  },
  checkboxText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  runBtn: {
    padding: "14px 24px",
    fontSize: "15px",
    fontWeight: 600,
    background: "var(--accent)",
    color: "var(--bg-primary)",
    border: "none",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all var(--transition)",
    letterSpacing: "-0.01em",
  },
  loadingText: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid var(--bg-primary)",
    borderTopColor: "transparent",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
};
