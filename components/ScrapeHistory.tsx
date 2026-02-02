"use client";

import { CSSProperties, useEffect, useState } from "react";

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

  if (loading) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.headerLabel}>SCRAPE HISTORY</span>
        </div>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (scrapes.length === 0) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.headerLabel}>SCRAPE HISTORY</span>
        </div>
        <div style={styles.empty}>No scrapes yet</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>SCRAPE HISTORY</span>
        <span style={styles.count}>{scrapes.length}</span>
      </div>
      <div style={styles.list}>
        {scrapes.map((scrape) => (
          <div
            key={scrape.id}
            style={{
              ...styles.item,
              ...(currentScrapeId === scrape.id ? styles.itemActive : {}),
            }}
            onClick={() => onSelect(scrape.id)}
          >
            <div style={styles.itemMain}>
              <div style={styles.itemFilters}>
                {summarizeFilters(scrape.filters)}
              </div>
              <div style={styles.itemMeta}>
                <span style={styles.itemDate}>{formatDate(scrape.scraped_at)}</span>
                <span style={styles.itemJobs}>{scrape.job_count} jobs</span>
              </div>
            </div>
            <button
              style={{
                ...styles.deleteBtn,
                opacity: deleting === scrape.id ? 0.5 : 1,
              }}
              onClick={(e) => handleDelete(scrape.id, e)}
              disabled={deleting === scrape.id}
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  header: {
    padding: "14px 18px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabel: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-tertiary)",
  },
  count: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    background: "var(--bg-secondary)",
    padding: "2px 8px",
    borderRadius: "10px",
  },
  list: {
    maxHeight: "240px",
    overflowY: "auto",
  },
  item: {
    padding: "12px 18px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    transition: "background var(--transition)",
  },
  itemActive: {
    background: "var(--accent-dim)",
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemFilters: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemMeta: {
    marginTop: "4px",
    display: "flex",
    gap: "12px",
  },
  itemDate: {
    fontSize: "11px",
    color: "var(--text-tertiary)",
    fontFamily: "var(--font-mono)",
  },
  itemJobs: {
    fontSize: "11px",
    color: "var(--accent)",
    fontFamily: "var(--font-mono)",
  },
  deleteBtn: {
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-tertiary)",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all var(--transition)",
    flexShrink: 0,
  },
  loading: {
    padding: "20px",
    fontSize: "12px",
    color: "var(--text-tertiary)",
    textAlign: "center",
  },
  empty: {
    padding: "20px",
    fontSize: "12px",
    color: "var(--text-tertiary)",
    textAlign: "center",
  },
};
