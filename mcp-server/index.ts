#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, Browser, Page, BrowserContext } from "playwright";

// Browser state
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// Tool definitions
const tools: Tool[] = [
  {
    name: "browser_launch",
    description:
      "Launch a browser session. Call this before any other browser tools. Opens a visible browser window you can watch.",
    inputSchema: {
      type: "object",
      properties: {
        headless: {
          type: "boolean",
          description: "Run headless (invisible). Default false so user can watch.",
          default: false,
        },
        slowMo: {
          type: "number",
          description: "Slow down actions by this many ms. Default 50 for visibility.",
          default: 50,
        },
      },
    },
  },
  {
    name: "browser_navigate",
    description: "Navigate to a URL. Returns page title and text content.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_screenshot",
    description:
      "Take a screenshot of the current page. Returns base64 image. Use this to see what's on screen and decide what to do next.",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page. Default false (viewport only).",
          default: false,
        },
      },
    },
  },
  {
    name: "browser_click",
    description:
      "Click an element on the page. You can use text content, aria labels, or CSS selectors.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            'What to click. Can be: text content ("Easy Apply"), aria-label, role, or CSS selector. Playwright will find the best match.',
        },
        timeout: {
          type: "number",
          description: "Max time to wait for element in ms. Default 5000.",
          default: 5000,
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_fill",
    description: "Fill a form field with text. Use for input fields, textareas, etc.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "The field to fill. Can be label text, placeholder, name attribute, or CSS selector.",
        },
        value: {
          type: "string",
          description: "The text to enter into the field.",
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_select",
    description: "Select an option from a dropdown/select element.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "The dropdown to interact with.",
        },
        value: {
          type: "string",
          description: "The option value or visible text to select.",
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_get_content",
    description:
      "Get the text content of the current page or a specific element. Useful for reading form labels, error messages, etc.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "Optional CSS selector to get content from specific element. Omit for full page.",
        },
      },
    },
  },
  {
    name: "browser_get_elements",
    description:
      "Get a list of interactive elements on the page (buttons, links, inputs). Helps you understand what actions are available.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["buttons", "links", "inputs", "all"],
          description: "Type of elements to find. Default 'all'.",
          default: "all",
        },
      },
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the page up or down.",
    inputSchema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "Scroll direction.",
        },
        amount: {
          type: "number",
          description: "Pixels to scroll. Default 500.",
          default: 500,
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "browser_wait",
    description: "Wait for an element to appear or for a specified time.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to wait for. If omitted, waits for specified ms.",
        },
        ms: {
          type: "number",
          description: "Milliseconds to wait. Used if no selector provided. Default 1000.",
          default: 1000,
        },
      },
    },
  },
  {
    name: "browser_back",
    description: "Go back to the previous page.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "browser_close",
    description: "Close the browser session. Call when done with automation.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "browser_press_key",
    description: "Press a keyboard key (Enter, Tab, Escape, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key to press: Enter, Tab, Escape, ArrowDown, etc.",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "browser_upload_file",
    description: "Upload a file to a file input element.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "The file input selector.",
        },
        filePath: {
          type: "string",
          description: "Absolute path to the file to upload.",
        },
      },
      required: ["selector", "filePath"],
    },
  },
];

// Helper to ensure browser is ready
function ensureBrowser(): { context: BrowserContext; page: Page } {
  if (!browser || !context || !page) {
    throw new Error("Browser not launched. Call browser_launch first.");
  }
  return { context, page };
}

// Smart selector - tries multiple strategies
async function smartClick(page: Page, selector: string, timeout: number): Promise<void> {
  // Try strategies in order
  const strategies = [
    // 1. Exact text
    () => page.getByText(selector, { exact: true }).click({ timeout }),
    // 2. Partial text
    () => page.getByText(selector).click({ timeout }),
    // 3. Role + name
    () => page.getByRole("button", { name: selector }).click({ timeout }),
    () => page.getByRole("link", { name: selector }).click({ timeout }),
    // 4. Label
    () => page.getByLabel(selector).click({ timeout }),
    // 5. Placeholder
    () => page.getByPlaceholder(selector).click({ timeout }),
    // 6. CSS selector
    () => page.locator(selector).click({ timeout }),
  ];

  let lastError: Error | null = null;
  for (const strategy of strategies) {
    try {
      await strategy();
      return;
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError || new Error(`Could not find element: ${selector}`);
}

// Smart fill - tries multiple strategies
async function smartFill(page: Page, selector: string, value: string): Promise<void> {
  const strategies = [
    () => page.getByLabel(selector).fill(value),
    () => page.getByPlaceholder(selector).fill(value),
    () => page.getByRole("textbox", { name: selector }).fill(value),
    () => page.locator(selector).fill(value),
    () => page.locator(`[name="${selector}"]`).fill(value),
    () => page.locator(`[aria-label="${selector}"]`).fill(value),
  ];

  let lastError: Error | null = null;
  for (const strategy of strategies) {
    try {
      await strategy();
      return;
    } catch (e) {
      lastError = e as Error;
    }
  }
  throw lastError || new Error(`Could not find field: ${selector}`);
}

// Tool handlers
async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
  switch (name) {
    case "browser_launch": {
      if (browser) {
        await browser.close();
      }
      const headless = (args.headless as boolean) ?? false;
      const slowMo = (args.slowMo as number) ?? 50;

      browser = await chromium.launch({
        headless,
        slowMo,
        args: ["--start-maximized"],
      });
      context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      page = await context.newPage();

      return {
        content: [
          {
            type: "text",
            text: `Browser launched successfully (headless: ${headless}, slowMo: ${slowMo}ms). Ready for navigation.`,
          },
        ],
      };
    }

    case "browser_navigate": {
      const { page } = ensureBrowser();
      const url = args.url as string;

      await page.goto(url, { waitUntil: "domcontentloaded" });
      const title = await page.title();
      const content = await page.locator("body").innerText().catch(() => "");
      const truncated = content.slice(0, 2000);

      return {
        content: [
          {
            type: "text",
            text: `Navigated to: ${url}\nTitle: ${title}\n\nPage content (first 2000 chars):\n${truncated}`,
          },
        ],
      };
    }

    case "browser_screenshot": {
      const { page } = ensureBrowser();
      const fullPage = (args.fullPage as boolean) ?? false;

      const buffer = await page.screenshot({ fullPage, type: "png" });
      const base64 = buffer.toString("base64");

      return {
        content: [
          {
            type: "image",
            data: base64,
            mimeType: "image/png",
          },
          {
            type: "text",
            text: `Screenshot captured (fullPage: ${fullPage}). Current URL: ${page.url()}`,
          },
        ],
      };
    }

    case "browser_click": {
      const { page } = ensureBrowser();
      const selector = args.selector as string;
      const timeout = (args.timeout as number) ?? 5000;

      await smartClick(page, selector, timeout);
      await page.waitForTimeout(300); // Small delay for UI updates

      return {
        content: [
          {
            type: "text",
            text: `Clicked: "${selector}". Current URL: ${page.url()}`,
          },
        ],
      };
    }

    case "browser_fill": {
      const { page } = ensureBrowser();
      const selector = args.selector as string;
      const value = args.value as string;

      await smartFill(page, selector, value);

      return {
        content: [
          {
            type: "text",
            text: `Filled "${selector}" with "${value}"`,
          },
        ],
      };
    }

    case "browser_select": {
      const { page } = ensureBrowser();
      const selector = args.selector as string;
      const value = args.value as string;

      // Try by label first, then by value
      try {
        await page.getByLabel(selector).selectOption({ label: value });
      } catch {
        await page.locator(selector).selectOption(value);
      }

      return {
        content: [
          {
            type: "text",
            text: `Selected "${value}" in "${selector}"`,
          },
        ],
      };
    }

    case "browser_get_content": {
      const { page } = ensureBrowser();
      const selector = args.selector as string | undefined;

      let content: string;
      if (selector) {
        content = await page.locator(selector).innerText();
      } else {
        content = await page.locator("body").innerText();
      }

      const truncated = content.slice(0, 5000);
      return {
        content: [
          {
            type: "text",
            text: truncated + (content.length > 5000 ? "\n...(truncated)" : ""),
          },
        ],
      };
    }

    case "browser_get_elements": {
      const { page } = ensureBrowser();
      const type = (args.type as string) ?? "all";

      const elements: string[] = [];

      if (type === "buttons" || type === "all") {
        const buttons = await page.locator("button, [role='button'], input[type='submit']").all();
        for (const btn of buttons.slice(0, 20)) {
          const text = await btn.innerText().catch(() => "");
          const ariaLabel = await btn.getAttribute("aria-label");
          elements.push(`[Button] ${text || ariaLabel || "(no text)"}`);
        }
      }

      if (type === "links" || type === "all") {
        const links = await page.locator("a[href]").all();
        for (const link of links.slice(0, 20)) {
          const text = await link.innerText().catch(() => "");
          const href = await link.getAttribute("href");
          elements.push(`[Link] ${text || "(no text)"} -> ${href}`);
        }
      }

      if (type === "inputs" || type === "all") {
        const inputs = await page.locator("input, textarea, select").all();
        for (const input of inputs.slice(0, 20)) {
          const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
          const type = await input.getAttribute("type");
          const name = await input.getAttribute("name");
          const label = await input.getAttribute("aria-label");
          const placeholder = await input.getAttribute("placeholder");
          elements.push(
            `[${tagName}${type ? `:${type}` : ""}] name="${name}" label="${label}" placeholder="${placeholder}"`
          );
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `Found ${elements.length} elements:\n${elements.join("\n")}`,
          },
        ],
      };
    }

    case "browser_scroll": {
      const { page } = ensureBrowser();
      const direction = args.direction as "up" | "down";
      const amount = (args.amount as number) ?? 500;

      const delta = direction === "down" ? amount : -amount;
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(200);

      return {
        content: [
          {
            type: "text",
            text: `Scrolled ${direction} by ${amount}px`,
          },
        ],
      };
    }

    case "browser_wait": {
      const { page } = ensureBrowser();
      const selector = args.selector as string | undefined;
      const ms = (args.ms as number) ?? 1000;

      if (selector) {
        await page.locator(selector).waitFor({ timeout: 10000 });
        return {
          content: [{ type: "text", text: `Element found: ${selector}` }],
        };
      } else {
        await page.waitForTimeout(ms);
        return {
          content: [{ type: "text", text: `Waited ${ms}ms` }],
        };
      }
    }

    case "browser_back": {
      const { page } = ensureBrowser();
      await page.goBack();
      return {
        content: [{ type: "text", text: `Navigated back. Current URL: ${page.url()}` }],
      };
    }

    case "browser_close": {
      if (browser) {
        await browser.close();
        browser = null;
        context = null;
        page = null;
      }
      return {
        content: [{ type: "text", text: "Browser closed." }],
      };
    }

    case "browser_press_key": {
      const { page } = ensureBrowser();
      const key = args.key as string;
      await page.keyboard.press(key);
      return {
        content: [{ type: "text", text: `Pressed key: ${key}` }],
      };
    }

    case "browser_upload_file": {
      const { page } = ensureBrowser();
      const selector = args.selector as string;
      const filePath = args.filePath as string;

      await page.locator(selector).setInputFiles(filePath);
      return {
        content: [{ type: "text", text: `Uploaded file: ${filePath}` }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create and start server
const server = new Server(
  {
    name: "jobseek-browser",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleTool(name, args as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Cleanup on exit
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (browser) await browser.close();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("JobSeek MCP Browser Server running on stdio");
}

main().catch(console.error);
