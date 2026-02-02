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
import sys
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
        from playwright_stealth import stealth_async
    except ImportError as e:
        missing.append("playwright-stealth")
        errors.append(str(e))
    if missing:
        console_msg = f"Missing deps: {', '.join(missing)}. Errors: {'; '.join(errors)}"
        print(json.dumps({"error": console_msg}))
        sys.exit(1)

_check_deps()

from playwright.async_api import async_playwright, TimeoutError as PwTimeout
from playwright_stealth import stealth_async

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

async def run(filters: dict, max_pages: int):
    email = os.environ.get("LINKEDIN_EMAIL", "")
    password = os.environ.get("LINKEDIN_PASSWORD", "")

    if not email or not password:
        print(json.dumps({"error": "LINKEDIN_EMAIL and LINKEDIN_PASSWORD env vars required."}))
        sys.exit(1)

    search_url = build_search_url(filters)
    log(f"🔍 {search_url}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-US",
            timezone_id="America/New_York",
        )
        page = await context.new_page()
        await stealth_async(page)

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
    args = parser.parse_args()
    filters = json.loads(args.filters)
    asyncio.run(run(filters, args.max_pages))


if __name__ == "__main__":
    main()
