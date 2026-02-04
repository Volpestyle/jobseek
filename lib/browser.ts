import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface StealthBrowserResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

const STEALTH_SCRIPTS = `
  // Override navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => false });

  // Fake chrome.runtime
  window.chrome = { runtime: {} };

  // Fake plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });

  // Fake languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
  });

  // Override Permissions.query
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
      : originalQuery(parameters);
`;

const CHROMIUM_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-sandbox",
];

const DEFAULT_VIEWPORT = { width: 1366, height: 768 };
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function applyStealthScripts(page: Page): Promise<void> {
  await page.addInitScript(STEALTH_SCRIPTS);
}

export async function launchStealthBrowser(options?: {
  headless?: boolean;
}): Promise<StealthBrowserResult> {
  const headless = options?.headless ?? true;

  const browser = await chromium.launch({
    headless,
    args: CHROMIUM_ARGS,
  });

  const context = await browser.newContext({
    viewport: DEFAULT_VIEWPORT,
    userAgent: DEFAULT_UA,
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  const page = await context.newPage();
  await applyStealthScripts(page);

  return { browser, context, page };
}

export async function humanDelay(lo = 0.8, hi = 2.5): Promise<void> {
  const ms = (Math.random() * (hi - lo) + lo) * 1000;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function humanScroll(page: Page, times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    const delta = Math.floor(Math.random() * 400) + 300;
    await page.mouse.wheel(0, delta);
    await humanDelay(0.4, 1.2);
  }
}

export async function humanType(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  const el = page.locator(selector);
  await el.click();
  await humanDelay(0.3, 0.6);
  for (const ch of text) {
    await el.pressSequentially(ch, { delay: Math.floor(Math.random() * 100) + 50 });
  }
  await humanDelay(0.3, 0.8);
}

export async function loginToLinkedIn(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
  });
  await humanDelay(1, 2);
  await humanType(page, "#username", email);
  await humanType(page, "#password", password);
  await humanDelay(0.5, 1);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForURL("**/feed/**", { timeout: 30000 });
  } catch {
    // Possible CAPTCHA — wait longer
    try {
      await page.waitForURL("**/feed/**", { timeout: 60000 });
    } catch {
      throw new Error(
        "Login failed — CAPTCHA or invalid credentials. Try running with showBrowser: true."
      );
    }
  }
}

export { STEALTH_SCRIPTS, CHROMIUM_ARGS };
