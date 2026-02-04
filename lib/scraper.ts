export interface ScrapedJob {
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

export interface ScrapeOptions {
  filters: {
    keywords?: string;
    location?: string;
    remote?: boolean;
    experience?: string;
    date_posted?: string;
    showBrowser?: boolean;
  };
  maxPages?: number;
}

const EXPERIENCE_MAP: Record<string, string> = {
  internship: "1",
  entry: "2",
  associate: "3",
  "mid-senior": "4",
  director: "5",
  executive: "6",
};

const DATE_MAP: Record<string, string> = {
  "24h": "r86400",
  week: "r604800",
  month: "r2592000",
};

export function buildSearchUrl(filters: ScrapeOptions["filters"]): string {
  const base = "https://www.linkedin.com/jobs/search/?";
  const params: string[] = [];

  if (filters.keywords) {
    params.push(`keywords=${encodeURIComponent(filters.keywords)}`);
  }
  if (filters.location) {
    params.push(`location=${encodeURIComponent(filters.location)}`);
  }
  if (filters.remote) {
    params.push("f_WT=2");
  }
  if (filters.experience) {
    const code = EXPERIENCE_MAP[filters.experience.toLowerCase()];
    if (code) params.push(`f_E=${code}`);
  }
  if (filters.date_posted) {
    const code = DATE_MAP[filters.date_posted];
    if (code) params.push(`f_TPR=${code}`);
  }

  params.push("sortBy=DD");
  return base + params.join("&");
}
