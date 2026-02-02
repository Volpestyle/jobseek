"use client";

import { CSSProperties, useState } from "react";

export interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  salary: string | null;
  posted: string | null;
}

interface JobTableProps {
  jobs: Job[];
  scrapedAt: string | null;
  isLoading: boolean;
  error: string | null;
  logs: string | null;
}

export default function JobTable({
  jobs,
  scrapedAt,
  isLoading,
  error,
  logs,
}: JobTableProps) {
  const [search, setSearch] = useState("");
  const [showLogs, setShowLogs] = useState(false);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      (j.salary && j.salary.toLowerCase().includes(q))
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
    <div style={styles.container}>
      {/* Header bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <h2 style={styles.title}>
            Results
            {jobs.length > 0 && (
              <span style={styles.count}>{filtered.length}</span>
            )}
          </h2>
          {scrapedAt && (
            <span style={styles.timestamp}>
              {new Date(scrapedAt).toLocaleString()}
            </span>
          )}
        </div>
        <div style={styles.topBarRight}>
          {jobs.length > 0 && (
            <>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Filter results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button onClick={exportCSV} style={styles.exportBtn}>
                CSV
              </button>
              <button onClick={exportJSON} style={styles.exportBtn}>
                JSON
              </button>
            </>
          )}
          {logs && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              style={styles.logsBtn}
            >
              {showLogs ? "Hide" : "Logs"}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <span style={{ fontWeight: 600 }}>Error:</span> {error}
        </div>
      )}

      {/* Logs */}
      {showLogs && logs && (
        <pre style={styles.logsBox}>{logs}</pre>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={styles.loadingBox}>
          <div style={styles.loadingSpinner} />
          <div>
            <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              Scraping LinkedIn...
            </p>
            <p style={{ color: "var(--text-tertiary)", fontSize: "13px" }}>
              This takes 1–3 minutes depending on page count. The scraper mimics
              human behavior with random delays.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && jobs.length === 0 && !error && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <p style={styles.emptyTitle}>No results yet</p>
          <p style={styles.emptyDesc}>
            Configure your filters and hit Run Scrape to get started.
          </p>
        </div>
      )}

      {/* Job cards */}
      {filtered.length > 0 && (
        <div style={styles.jobList}>
          {filtered.map((job, i) => (
            <a
              key={job.link || i}
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.jobCard}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border-focus)";
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-card)";
              }}
            >
              <div style={styles.jobHeader}>
                <span style={styles.jobIndex}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 style={styles.jobTitle}>{job.title}</h3>
              </div>
              <div style={styles.jobMeta}>
                <span style={styles.jobCompany}>{job.company}</span>
                <span style={styles.jobDivider}>·</span>
                <span style={styles.jobLocation}>{job.location}</span>
                {job.salary && (
                  <>
                    <span style={styles.jobDivider}>·</span>
                    <span style={styles.jobSalary}>{job.salary}</span>
                  </>
                )}
                {job.posted && (
                  <>
                    <span style={styles.jobDivider}>·</span>
                    <span style={styles.jobPosted}>{job.posted}</span>
                  </>
                )}
              </div>
              <span style={styles.jobLink}>
                linkedin.com/jobs/view/...
                <span style={styles.arrow}>→</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minHeight: "400px",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  count: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--accent)",
    background: "var(--accent-dim)",
    padding: "2px 10px",
    borderRadius: "20px",
  },
  timestamp: {
    fontSize: "12px",
    color: "var(--text-tertiary)",
    fontFamily: "var(--font-mono)",
  },
  searchInput: {
    padding: "8px 14px",
    fontSize: "13px",
    background: "var(--bg-secondary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    width: "200px",
  },
  exportBtn: {
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 600,
    background: "var(--bg-tertiary)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    transition: "all var(--transition)",
  },
  logsBtn: {
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 600,
    background: "var(--warning-dim)",
    color: "var(--warning)",
    border: "1px solid var(--warning)",
    borderRadius: "var(--radius-sm)",
    transition: "all var(--transition)",
  },
  errorBox: {
    padding: "14px 18px",
    background: "var(--danger-dim)",
    border: "1px solid var(--danger)",
    borderRadius: "var(--radius-md)",
    color: "var(--danger)",
    fontSize: "14px",
  },
  logsBox: {
    padding: "16px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    color: "var(--text-secondary)",
    maxHeight: "200px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "32px 24px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
  },
  loadingSpinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--border)",
    borderTopColor: "var(--accent)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 40px",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: "40px",
    marginBottom: "16px",
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "8px",
  },
  emptyDesc: {
    fontSize: "14px",
    color: "var(--text-tertiary)",
  },
  jobList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  jobCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "18px 20px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    transition: "all var(--transition)",
    textDecoration: "none",
  },
  jobHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  jobIndex: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-tertiary)",
    flexShrink: 0,
  },
  jobTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.3,
  },
  jobMeta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
    paddingLeft: "36px",
    fontSize: "13px",
  },
  jobCompany: {
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  jobDivider: {
    color: "var(--text-tertiary)",
  },
  jobLocation: {
    color: "var(--text-tertiary)",
  },
  jobSalary: {
    color: "var(--accent)",
    fontWeight: 500,
  },
  jobPosted: {
    color: "var(--text-tertiary)",
    fontSize: "12px",
  },
  jobLink: {
    paddingLeft: "36px",
    fontSize: "12px",
    fontFamily: "var(--font-mono)",
    color: "var(--text-tertiary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  arrow: {
    color: "var(--accent)",
    transition: "transform var(--transition)",
  },
};
