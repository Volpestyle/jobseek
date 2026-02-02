#!/usr/bin/env python3
"""
LinkedIn Job Application Script — uses Playwright to fill and submit applications.

Usage:
    python3 apply_job.py --job-url 'https://linkedin.com/jobs/view/...' --preferences '{"name":"...","email":"..."}'

Outputs JSON status/prompts to stdout. Progress goes to stderr.
Credentials from LINKEDIN_EMAIL / LINKEDIN_PASSWORD env vars.

When encountering unknown fields, outputs:
    {"type": "NEED_INPUT", "field": "field_name", "prompt": "Question text", "options": [...]}

And waits for JSON input on stdin:
    {"field": "field_name", "value": "user's answer"}
"""

import argparse
import asyncio
import json
import os
import random
import sys
import select
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
    print(json.dumps({"type": "error", "message": console_msg}))
    sys.exit(1)

from playwright.async_api import async_playwright, TimeoutError as PwTimeout

# ---------------------------------------------------------------------------
# Human-like helpers
# ---------------------------------------------------------------------------

async def human_delay(lo=0.8, hi=2.5):
    await asyncio.sleep(random.uniform(lo, hi))

async def human_type(page, selector, text):
    el = page.locator(selector)
    await el.click()
    await human_delay(0.3, 0.6)
    await el.fill("")  # Clear existing
    for ch in text:
        await el.press_sequentially(ch, delay=random.randint(50, 150))
    await human_delay(0.3, 0.8)

def log(msg):
    """Log to stderr so stdout stays clean for JSON output."""
    print(msg, file=sys.stderr, flush=True)

def output(data: dict):
    """Output JSON to stdout for the API to parse."""
    print(json.dumps(data), flush=True)

def wait_for_input(timeout=300) -> dict | None:
    """Wait for JSON input from stdin with timeout."""
    log(f"⏳ Waiting for user input (timeout: {timeout}s)...")

    # Use select for timeout on Unix
    if sys.platform != "win32":
        readable, _, _ = select.select([sys.stdin], [], [], timeout)
        if not readable:
            return None

    try:
        line = sys.stdin.readline().strip()
        if line:
            return json.loads(line)
    except (json.JSONDecodeError, EOFError):
        pass
    return None

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
            raise Exception("Login failed — CAPTCHA or invalid credentials.")

    log("✅ Logged in")

# ---------------------------------------------------------------------------
# Application filling
# ---------------------------------------------------------------------------

COMMON_FIELDS = {
    "first_name": ["first name", "given name", "fname"],
    "last_name": ["last name", "family name", "surname", "lname"],
    "email": ["email", "e-mail"],
    "phone": ["phone", "mobile", "telephone", "cell"],
    "linkedin": ["linkedin", "linkedin url", "linkedin profile"],
    "resume": ["resume", "cv"],
    "cover_letter": ["cover letter", "cover"],
    "years_experience": ["years of experience", "years experience", "experience years", "how many years"],
    "salary_expectation": ["salary", "compensation", "expected salary", "desired salary"],
    "start_date": ["start date", "availability", "when can you start"],
    "location": ["location", "city", "where are you located"],
    "work_authorization": ["work authorization", "authorized to work", "legally authorized", "visa", "sponsorship"],
    "willing_to_relocate": ["relocate", "relocation", "willing to move"],
}

def match_field_type(label: str) -> str | None:
    """Try to match a form label to a known field type."""
    label_lower = label.lower().strip()
    for field_type, keywords in COMMON_FIELDS.items():
        for kw in keywords:
            if kw in label_lower:
                return field_type
    return None

async def get_form_fields(page) -> list[dict]:
    """Extract all visible form fields from the current application step."""
    fields = await page.evaluate("""
    () => {
        const fields = [];

        // Text inputs
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea');
        for (const input of inputs) {
            if (input.offsetParent === null) continue; // Skip hidden
            const label = input.labels?.[0]?.innerText || input.placeholder || input.name || '';
            fields.push({
                type: 'text',
                selector: input.id ? `#${input.id}` : `[name="${input.name}"]`,
                label: label.trim(),
                required: input.required,
                value: input.value,
            });
        }

        // Select dropdowns
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
            if (select.offsetParent === null) continue;
            const label = select.labels?.[0]?.innerText || select.name || '';
            const options = [...select.options].map(o => ({ value: o.value, text: o.text }));
            fields.push({
                type: 'select',
                selector: select.id ? `#${select.id}` : `[name="${select.name}"]`,
                label: label.trim(),
                required: select.required,
                value: select.value,
                options: options,
            });
        }

        // Radio buttons
        const radioGroups = {};
        const radios = document.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
            if (radio.offsetParent === null) continue;
            const name = radio.name;
            if (!radioGroups[name]) {
                radioGroups[name] = {
                    type: 'radio',
                    name: name,
                    label: '',
                    options: [],
                    value: null,
                };
            }
            const labelEl = radio.labels?.[0] || radio.closest('label');
            radioGroups[name].options.push({
                value: radio.value,
                text: labelEl?.innerText?.trim() || radio.value,
            });
            if (radio.checked) {
                radioGroups[name].value = radio.value;
            }
        }

        // Find group labels for radios
        for (const name of Object.keys(radioGroups)) {
            const first = document.querySelector(`input[name="${name}"]`);
            const fieldset = first?.closest('fieldset');
            const legend = fieldset?.querySelector('legend');
            const groupLabel = first?.closest('[class*="question"]')?.querySelector('label, span');
            radioGroups[name].label = legend?.innerText?.trim() || groupLabel?.innerText?.trim() || name;
            radioGroups[name].selector = `input[name="${name}"]`;
            fields.push(radioGroups[name]);
        }

        return fields;
    }
    """)
    return fields

async def fill_field(page, field: dict, value: str):
    """Fill a form field with the given value."""
    selector = field["selector"]
    field_type = field["type"]

    if field_type == "text":
        el = page.locator(selector).first
        await el.click()
        await human_delay(0.2, 0.4)
        await el.fill("")
        await el.type(value, delay=random.randint(30, 80))
        await human_delay(0.2, 0.5)

    elif field_type == "select":
        el = page.locator(selector).first
        await el.select_option(value)
        await human_delay(0.3, 0.6)

    elif field_type == "radio":
        # Find the radio with matching value
        radio = page.locator(f'{selector}[value="{value}"]')
        if await radio.count() > 0:
            await radio.click()
            await human_delay(0.2, 0.5)

async def click_next_or_submit(page) -> str:
    """Click the next/submit button and return the action taken."""
    # Look for submit button first
    submit_selectors = [
        'button[aria-label*="Submit"]',
        'button:has-text("Submit application")',
        'button:has-text("Submit")',
    ]
    for sel in submit_selectors:
        btn = page.locator(sel).first
        if await btn.count() > 0 and await btn.is_visible():
            await btn.click()
            return "submit"

    # Look for next/continue button
    next_selectors = [
        'button[aria-label*="Continue"]',
        'button[aria-label*="Next"]',
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Review")',
    ]
    for sel in next_selectors:
        btn = page.locator(sel).first
        if await btn.count() > 0 and await btn.is_visible():
            await btn.click()
            return "next"

    return "none"

async def check_for_easy_apply(page) -> bool:
    """Check if Easy Apply button is available."""
    easy_apply = page.locator('button:has-text("Easy Apply"), button[aria-label*="Easy Apply"]')
    return await easy_apply.count() > 0

async def click_easy_apply(page):
    """Click the Easy Apply button."""
    easy_apply = page.locator('button:has-text("Easy Apply"), button[aria-label*="Easy Apply"]').first
    await easy_apply.click()
    await human_delay(1, 2)

# ---------------------------------------------------------------------------
# Main application flow
# ---------------------------------------------------------------------------

async def run_application(job_url: str, preferences: dict, show_browser: bool):
    email = os.environ.get("LINKEDIN_EMAIL", "")
    password = os.environ.get("LINKEDIN_PASSWORD", "")

    if not email or not password:
        output({"type": "error", "message": "LINKEDIN_EMAIL and LINKEDIN_PASSWORD env vars required."})
        sys.exit(1)

    log(f"🎯 Applying to: {job_url}")
    output({"type": "status", "message": "Starting application process..."})

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

        # Navigate to job posting
        output({"type": "status", "message": "Navigating to job posting..."})
        await page.goto(job_url, wait_until="domcontentloaded")
        await human_delay(2, 3)

        # Check for Easy Apply
        if not await check_for_easy_apply(page):
            output({"type": "error", "message": "Easy Apply not available for this job. External application required."})
            await browser.close()
            return

        # Click Easy Apply
        output({"type": "status", "message": "Opening Easy Apply form..."})
        await click_easy_apply(page)
        await human_delay(1.5, 2.5)

        # Process application form
        max_steps = 10
        step = 0

        while step < max_steps:
            step += 1
            output({"type": "status", "message": f"Processing step {step}..."})

            # Get form fields
            fields = await get_form_fields(page)
            log(f"📋 Found {len(fields)} fields on step {step}")

            for field in fields:
                label = field.get("label", "")
                field_type = match_field_type(label)
                current_value = field.get("value", "")

                # Skip if already filled
                if current_value and current_value.strip():
                    log(f"   ✓ {label}: already filled")
                    continue

                # Try to fill from preferences
                if field_type and field_type in preferences:
                    value = preferences[field_type]
                    log(f"   → {label}: using preference '{field_type}'")
                    await fill_field(page, field, value)
                    output({"type": "filled", "field": label, "value": value})
                    continue

                # Need user input
                log(f"   ? {label}: needs input")
                prompt_data = {
                    "type": "NEED_INPUT",
                    "field": label,
                    "prompt": label,
                    "field_type": field["type"],
                }
                if field["type"] == "select" or field["type"] == "radio":
                    prompt_data["options"] = field.get("options", [])

                output(prompt_data)

                # Wait for user response
                response = wait_for_input(timeout=300)
                if response and response.get("value"):
                    value = response["value"]
                    await fill_field(page, field, value)
                    output({"type": "filled", "field": label, "value": value})

                    # Save preference if user provided one
                    if response.get("save_preference") and field_type:
                        output({
                            "type": "save_preference",
                            "category": field_type,
                            "question": label,
                            "answer": value
                        })
                else:
                    output({"type": "warning", "message": f"No input received for: {label}"})

            await human_delay(1, 2)

            # Click next or submit
            action = await click_next_or_submit(page)
            log(f"   Action: {action}")

            if action == "submit":
                await human_delay(2, 3)
                output({"type": "complete", "message": "Application submitted successfully!"})
                break
            elif action == "next":
                await human_delay(1.5, 2.5)
            else:
                # No button found, might be done or stuck
                output({"type": "warning", "message": "No next/submit button found. Application may be complete or stuck."})
                break

        await browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-url", type=str, required=True)
    parser.add_argument("--preferences", type=str, default="{}")
    parser.add_argument("--show-browser", action="store_true")
    args = parser.parse_args()

    preferences = json.loads(args.preferences)
    asyncio.run(run_application(args.job_url, preferences, args.show_browser))


if __name__ == "__main__":
    main()
