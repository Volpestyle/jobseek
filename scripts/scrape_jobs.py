#!/usr/bin/env python3
"""
LinkedIn Job Scraper — called by the Next.js API route.

Usage:
    python3 scrape_jobs.py --filters '{"keywords":"..."}' --max-pages 5

Outputs JSON array to stdout. Progress/status goes to stderr.
Credentials from LINKEDIN_EMAIL / LINKEDIN_PASSWORD env vars.
"""

import argparse
import asyncio
import json
import os
import random
import subprocess
import sys
import textwrap
from pathlib import Path

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------

missing = []
errors = []
try:
    import playwright
except ImportError as e:
    missing.append("playwright")
    errors.append(str(e))
try:
    from playwright_stealth import Stealth
except ImportError as e:
    missing.append("playwright-stealth")
    errors.append(str(e))
if missing:
    console_msg = f"Missing deps: {', '.join(missing)}. Errors: {'; '.join(errors)}"
    print(json.dumps({"error": console_msg}))
    sys.exit(1)


from playwright.async_api import async_playwright, TimeoutError as PwTimeout
from playwright_stealth import Stealth

# ---------------------------------------------------------------------------
# Human-like helpers
# ---------------------------------------------------------------------------

async def human_delay(lo=0.8, hi=2.5):
    await asyncio.sleep(random.uniform(lo, hi))

async def human_scroll(page, times=3):
    for _ in range(times):
        delta = random.randint(300, 700)
        await page.mouse.wheel(0, delta)
        await human_delay(0.4, 1.2)

async def human_type(page, selector, text):
    el = page.locator(selector)
    await el.click()
    await human_delay(0.3, 0.6)
    for ch in text:
        await el.press_sequentially(ch, delay=random.randint(50, 150))
    await human_delay(0.3, 0.8)

def log(msg):
    """Log to stderr so stdout stays clean for JSON output."""
    print(msg, file=sys.stderr, flush=True)

# ---------------------------------------------------------------------------
# Summary + extraction helpers (Claude CLI)
# ---------------------------------------------------------------------------

SUMMARY_FIELDS_PATH = Path(__file__).with_name("summary_fields.json")

DEFAULT_SUMMARY_FIELDS = [
    {
        "key": "skills",
        "type": "array",
        "description": "Hard and soft skills explicitly mentioned",
    },
    {
        "key": "tech_stack",
        "type": "array",
        "description": "Technologies, languages, frameworks, tools, or platforms",
    },
    {
        "key": "years_experience",
        "type": "string",
        "description": "Years of experience required (e.g., '3+ years')",
    },
    {
        "key": "education",
        "type": "string",
        "description": "Education requirements (degrees, fields, or equivalent)",
    },
    {
        "key": "responsibilities",
        "type": "array",
        "description": "Key responsibilities (short phrases)",
    },
    {
        "key": "requirements",
        "type": "array",
        "description": "Must-have requirements (short phrases)",
    },
    {
        "key": "seniority",
        "type": "string",
        "description": "Seniority level (e.g., junior, mid, senior, staff)",
    },
    {
        "key": "employment_type",
        "type": "string",
        "description": "Employment type (full-time, contract, internship, etc.)",
    },
    {
        "key": "location_type",
        "type": "string",
        "description": "Location type (remote, hybrid, onsite)",
    },
    {
        "key": "salary",
        "type": "string",
        "description": "Compensation mentioned in description",
    },
]

def load_summary_fields(path_override=None):
    env_fields = os.environ.get("JOB_SUMMARY_FIELDS")
    if env_fields:
        try:
            parsed = json.loads(env_fields)
            if isinstance(parsed, list) and parsed:
                return parsed
        except Exception:
            log("⚠️  Failed to parse JOB_SUMMARY_FIELDS env var; using defaults")

    path = Path(path_override) if path_override else SUMMARY_FIELDS_PATH
    if path.exists():
        try:
            with path.open("r", encoding="utf-8") as f:
                parsed = json.load(f)
                if isinstance(parsed, list) and parsed:
                    return parsed
        except Exception as exc:
            log(f"⚠️  Failed to load summary fields from {path}: {exc}")

    return DEFAULT_SUMMARY_FIELDS

def build_summary_schema(fields: list[dict]):
    props = {
        "summary": {"type": "string"},
    }

    for field in fields:
        key = field.get("key")
        ftype = field.get("type", "string")
        if not key:
            continue
        if ftype == "array":
            props[key] = {
                "type": ["array", "null"],
                "items": {"type": "string"},
            }
        else:
            props[key] = {"type": ["string", "null"]}

    return {
        "type": "object",
        "properties": props,
        "required": ["summary"],
    }

def normalize_whitespace(text: str) -> str:
    return " ".join(text.strip().split())

def truncate_text(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."

def parse_claude_json(raw: str):
    if not raw:
        return None
    raw = raw.strip()

    # First try direct JSON
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            # Some formats wrap the content
            for key in ("content", "completion", "response", "output"):
                if key in data and isinstance(data[key], str):
                    try:
                        inner = json.loads(data[key])
                        if isinstance(inner, dict):
                            return inner
                    except Exception:
                        pass
            return data
    except Exception:
        pass

    # Fallback: extract first {...} block
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start : end + 1])
        except Exception:
            return None

    return None

def call_claude_summary(prompt: str, schema: dict, model: str, timeout: int):
    cmd = [
        "claude",
        "-p",
        prompt,
        "--output-format",
        "text",
        "--json-schema",
        json.dumps(schema),
    ]
    if model:
        cmd.extend(["--model", model])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError:
        log("❌ Claude CLI not found on PATH. Install and authenticate Claude Code.")
        return None
    except subprocess.TimeoutExpired:
        log("⚠️  Claude summary timed out.")
        return None

    if result.returncode != 0:
        log(f"⚠️  Claude summary failed: {result.stderr.strip()}")
        return None

    parsed = parse_claude_json(result.stdout)
    if not parsed:
        log("⚠️  Claude summary returned non-JSON output.")
    return parsed

def build_summary_prompt(title: str, company: str, description: str, fields: list[dict]) -> str:
    field_lines = []
    for field in fields:
        key = field.get("key")
        desc = field.get("description", "")
        if not key:
            continue
        if desc:
            field_lines.append(f'- "{key}": {desc}')
        else:
            field_lines.append(f'- "{key}"')

    field_block = "\n".join(field_lines)

    prompt = f"""
You extract structured info from job descriptions.
Return JSON only that matches the schema.
Rules:
- Use concise phrases.
- If a field is not mentioned, use null (or [] for arrays).
- Summary should be 2-4 sentences max.

Fields to extract:
{field_block}

Job title: {title}
Company: {company}

Description:
{description}
"""
    return textwrap.dedent(prompt).strip()

# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

async def login(page, email, password):
    await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")
    await human_delay(1, 2)
    await human_type(page, "#username", email)
    await human_type(page, "#password", password)
    await human_delay(0.5, 1)
    await page.locator('button[type="submit"]').click()

    try:
        await page.wait_for_url("**/feed/**", timeout=30000)
    except PwTimeout:
        log("⚠️  Login redirect slow — possible CAPTCHA. Waiting 60s...")
        try:
            await page.wait_for_url("**/feed/**", timeout=60000)
        except PwTimeout:
            raise Exception("Login failed — CAPTCHA or invalid credentials. Try running with --headed.")

    log("✅ Logged in")

# ---------------------------------------------------------------------------
# URL builder
# ---------------------------------------------------------------------------

EXPERIENCE_MAP = {
    "internship": "1", "entry": "2", "associate": "3",
    "mid-senior": "4", "director": "5", "executive": "6",
}

def build_search_url(filters: dict) -> str:
    base = "https://www.linkedin.com/jobs/search/?"
    params = []

    if kw := filters.get("keywords"):
        params.append(f"keywords={kw.replace(' ', '%20')}")
    if loc := filters.get("location"):
        params.append(f"location={loc.replace(' ', '%20')}")
    if filters.get("remote"):
        params.append("f_WT=2")
    if exp := filters.get("experience"):
        if exp.lower() in EXPERIENCE_MAP:
            params.append(f"f_E={EXPERIENCE_MAP[exp.lower()]}")
    if dp := filters.get("date_posted"):
        date_map = {"24h": "r86400", "week": "r604800", "month": "r2592000"}
        if dp in date_map:
            params.append(f"f_TPR={date_map[dp]}")

    params.append("sortBy=DD")
    return base + "&".join(params)

# ---------------------------------------------------------------------------
# Job detail extraction
# ---------------------------------------------------------------------------

JOB_DESC_SELECTORS = [
    ".jobs-description-content__text",
    ".jobs-box__html-content",
    ".jobs-description__content",
    ".jobs-description-content__text--stretch",
]

def extract_job_id(link: str):
    if not link:
        return None
    # Expect /jobs/view/{id}
    parts = link.split("/jobs/view/")
    if len(parts) < 2:
        return None
    job_id = parts[1].split("/")[0].split("?")[0]
    return job_id or None

async def expand_description(page) -> None:
    selectors = [
        'button[aria-label="See more description"]',
        'button[aria-label="See more"]',
        'button:has-text("See more")',
    ]
    for sel in selectors:
        try:
            btn = page.locator(sel).first
            if await btn.count() > 0:
                await btn.click()
                await human_delay(0.2, 0.6)
                return
        except Exception:
            continue

async def open_job_detail(page, job_link: str) -> bool:
    job_id = extract_job_id(job_link)
    if not job_id:
        return False

    selector = f'a[href*="/jobs/view/{job_id}"]'
    link_el = page.locator(selector).first
    try:
        if await link_el.count() == 0:
            return False
        await link_el.scroll_into_view_if_needed()
        await human_delay(0.2, 0.6)
        await link_el.click()
        await human_delay(0.6, 1.2)
        return True
    except Exception:
        return False

async def extract_description_text(page):
    for sel in JOB_DESC_SELECTORS:
        try:
            await page.wait_for_selector(sel, timeout=2500)
            el = page.locator(sel).first
            if await el.count() > 0:
                text = await el.inner_text()
                text = normalize_whitespace(text)
                if text:
                    return text
        except PwTimeout:
            continue
        except Exception:
            continue
    return None

async def enrich_job_with_summary(
    page,
    job: dict,
    summarize: bool,
    summary_fields: list[dict],
    summary_schema: dict,
    model: str,
    timeout: int,
) -> dict:
    if not summarize:
        return job

    opened = await open_job_detail(page, job.get("link", ""))
    if not opened:
        return job

    await expand_description(page)
    description = await extract_description_text(page)
    if description:
        job["description"] = description

    if not description:
        return job

    trimmed_desc = truncate_text(description, 6000)
    prompt = build_summary_prompt(
        job.get("title", ""),
        job.get("company", ""),
        trimmed_desc,
        summary_fields,
    )

    summary = call_claude_summary(prompt, summary_schema, model, timeout)
    if not summary:
        return job

    job["summary"] = summary.get("summary")

    extracted: dict = {}
    for field in summary_fields:
        key = field.get("key")
        if not key:
            continue
        extracted[key] = summary.get(key)
    job["extracted"] = extracted

    if not job.get("salary") and summary.get("salary"):
        job["salary"] = summary.get("salary")

    return job

# ---------------------------------------------------------------------------
# Scrape
# ---------------------------------------------------------------------------

async def scrape_page(page) -> list[dict]:
    await human_delay(1, 2)
    await human_scroll(page, times=4)
    await human_delay(0.5, 1)

    jobs = await page.evaluate("""
    () => {
        const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, li.ember-view.occludable-update');
        const results = [];
        for (const card of cards) {
            const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link, a.job-card-list__title--link');
            const companyEl = card.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, .job-card-container__company-name');
            const locationEl = card.querySelector('.job-card-container__metadata-wrapper li, .artdeco-entity-lockup__caption, .job-card-container__metadata-item');
            const linkEl = card.querySelector('a[href*="/jobs/view/"]') || titleEl;
            const salaryEl = card.querySelector('.job-card-list__salary-info, .salary-main-rail__compensation-header');
            const timeEl = card.querySelector('time');

            const title = titleEl?.innerText?.trim() || '';
            const company = companyEl?.innerText?.trim() || '';
            const location = locationEl?.innerText?.trim() || '';
            const link = linkEl?.href || '';
            const salary = salaryEl?.innerText?.trim() || null;
            const posted = timeEl?.getAttribute('datetime') || timeEl?.innerText?.trim() || null;

            if (title) {
                results.push({ title, company, location, link: link.split('?')[0], salary, posted });
            }
        }
        return results;
    }
    """)
    return jobs

async def go_next_page(page, current_page: int) -> bool:
    try:
        next_btn = page.locator(f'button[aria-label="Page {current_page + 1}"]')
        if await next_btn.count() > 0:
            await human_delay(0.5, 1.5)
            await next_btn.click()
            await page.wait_for_load_state("domcontentloaded")
            await human_delay(1.5, 3)
            return True
    except Exception:
        pass
    return False

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def run(
    filters: dict,
    max_pages: int,
    show_browser: bool,
    summarize: bool,
    summarize_model: str,
    summarize_timeout: int,
    summarize_max: int,
    summary_fields_path: str,
):
    email = os.environ.get("LINKEDIN_EMAIL", "")
    password = os.environ.get("LINKEDIN_PASSWORD", "")

    if not email or not password:
        print(json.dumps({"error": "LINKEDIN_EMAIL and LINKEDIN_PASSWORD env vars required."}))
        sys.exit(1)

    search_url = build_search_url(filters)
    log(f"🔍 {search_url}")

    summary_fields = load_summary_fields(summary_fields_path)
    summary_schema = build_summary_schema(summary_fields)
    summarize_limit = summarize_max if summarize_max and summarize_max > 0 else None
    summarized_count = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=not show_browser,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-US",
            timezone_id="America/New_York",
        )
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)

        await login(page, email, password)
        await human_delay(2, 4)

        await page.goto(search_url, wait_until="domcontentloaded")
        await human_delay(2, 3)

        all_jobs = []
        seen_links = set()

        for pg in range(1, max_pages + 1):
            log(f"📄 Page {pg}...")
            jobs = await scrape_page(page)
            for j in jobs:
                if j["link"] not in seen_links:
                    seen_links.add(j["link"])
                    if summarize and (summarize_limit is None or summarized_count < summarize_limit):
                        j = await enrich_job_with_summary(
                            page,
                            j,
                            summarize=True,
                            summary_fields=summary_fields,
                            summary_schema=summary_schema,
                            model=summarize_model,
                            timeout=summarize_timeout,
                        )
                        summarized_count += 1
                        await human_delay(0.6, 1.4)
                    all_jobs.append(j)
            log(f"   Total: {len(all_jobs)}")

            if pg < max_pages:
                if not await go_next_page(page, pg):
                    log("   No more pages.")
                    break
            await human_delay(3, 7)

        await browser.close()

    unique = list({j["link"]: j for j in all_jobs}.values())

    # Output clean JSON to stdout
    print(json.dumps(unique))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--filters", type=str, required=True)
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--show-browser", action="store_true")
    parser.add_argument("--summarize", action="store_true")
    parser.add_argument(
        "--summarize-model",
        type=str,
        default=os.environ.get("JOB_SUMMARY_MODEL", "haiku"),
    )
    parser.add_argument(
        "--summarize-timeout",
        type=int,
        default=int(os.environ.get("JOB_SUMMARY_TIMEOUT", "60")),
    )
    parser.add_argument(
        "--summarize-max",
        type=int,
        default=int(os.environ.get("JOB_SUMMARY_MAX", "0")),
    )
    parser.add_argument(
        "--summary-fields",
        type=str,
        default=os.environ.get("JOB_SUMMARY_FIELDS_PATH", ""),
    )
    args = parser.parse_args()
    filters = json.loads(args.filters)
    asyncio.run(
        run(
            filters,
            args.max_pages,
            args.show_browser,
            args.summarize,
            args.summarize_model,
            args.summarize_timeout,
            args.summarize_max,
            args.summary_fields,
        )
    )


if __name__ == "__main__":
    main()
