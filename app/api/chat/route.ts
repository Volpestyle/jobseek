import { NextRequest } from "next/server";
import { streamClaude, streamClaudeAgentic, isClaudeDebugEnabled } from "@/lib/claude";
import { getChatPreferences } from "@/lib/db";
import { ChatMessage } from "@/lib/chat-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logChat = (...args: unknown[]) => {
  if (isClaudeDebugEnabled()) {
    console.log("[Chat]", ...args);
  }
};

interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  salary: string | null;
  posted: string | null;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  jobs: Job[];
  agentic?: boolean; // Enable full tool use mode
}

export async function POST(request: NextRequest) {
  logChat("Received chat request");

  try {
    const body: ChatRequest = await request.json();
    const { message, history, jobs = [], agentic = false } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const preferences = getChatPreferences();

    // Build job context
    const jobContext = jobs
      .map(
        (job, i) =>
          `${i + 1}. ${job.title} at ${job.company} (${job.location})${job.salary ? ` - ${job.salary}` : ""}\n   Link: ${job.link}`
      )
      .join("\n");

    // Build preferences context
    const prefContext =
      preferences.length > 0
        ? preferences
            .map((p) => `- ${p.question}: ${p.answer}`)
            .join("\n")
        : "No preferences saved yet.";

    // Build conversation history
    const conversationHistory = history
      .slice(-10)
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    // System prompt for agentic mode (with browser tools)
    const agenticSystemPrompt = `You are a job search assistant with browser automation capabilities.

You have access to browser tools to help users apply to jobs:
- browser_launch: Start a visible browser (user can watch)
- browser_navigate: Go to a URL
- browser_screenshot: See what's on screen
- browser_click: Click elements by text/label
- browser_fill: Fill form fields
- browser_get_elements: List interactive elements
- browser_press_key: Press keyboard keys
- browser_upload_file: Upload resume/files
- browser_close: End browser session

JOB DATA:
Total jobs: ${jobs.length}

${jobContext || "No jobs available."}

USER PREFERENCES (use these to fill forms):
${prefContext}

${conversationHistory ? `CONVERSATION:\n${conversationHistory}\n` : ""}

WORKFLOW FOR JOB APPLICATIONS:
1. Launch browser (headless: false so user can watch)
2. Navigate to job URL
3. Take screenshot to see the page
4. Look for "Apply" or "Easy Apply" button and click it
5. Fill form fields using user preferences
6. For unknown fields, ask the user
7. Take screenshots to confirm progress
8. Complete the application

When you learn new preferences from the user (salary, location, etc.), output:
[SAVE_PREFERENCE: category="category_name", q="question", a="answer"]

Be concise. Reference jobs by number. The user is watching the browser.`;

    // Simple prompt for non-agentic mode
    const simplePrompt = `You are a helpful job search assistant.

JOB DATA:
Total jobs: ${jobs.length}

${jobContext || "No jobs available."}

USER PREFERENCES:
${prefContext}

INSTRUCTIONS:
- Help evaluate jobs and find matches
- Reference jobs by number
- When user expresses a preference, output:
  [SAVE_PREFERENCE: category="category_name", q="question", a="answer"]
- When user wants to apply, tell them to enable agentic mode for browser automation

${conversationHistory ? `CONVERSATION:\n${conversationHistory}\n\n` : ""}USER: ${message}`;

    logChat("Mode:", agentic ? "AGENTIC" : "SIMPLE");
    logChat("Prompt length:", agentic ? agenticSystemPrompt.length : simplePrompt.length);

    const encoder = new TextEncoder();
    let abortGeneration: (() => void) | null = null;
    let abortRequested = false;
    let closeStream: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        let heartbeat: ReturnType<typeof setInterval> | null = null;
        let onAbort: (() => void) | null = null;

        const cleanup = () => {
          if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
          }
          if (onAbort) {
            request.signal.removeEventListener("abort", onAbort);
          }
        };

        const finish = () => {
          if (isClosed) return;
          isClosed = true;
          cleanup();
          try {
            controller.close();
          } catch {
            // Ignore close errors
          }
        };

        closeStream = finish;

        const sse = (event: string, data: unknown) => {
          if (isClosed) return;
          const sseMessage = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          try {
            controller.enqueue(encoder.encode(sseMessage));
          } catch (error) {
            logChat("Failed to enqueue SSE:", error);
            abortRequested = true;
            if (abortGeneration) {
              abortGeneration();
            }
            finish();
          }
        };

        onAbort = () => {
          abortRequested = true;
          if (abortGeneration) {
            abortGeneration();
          }
          finish();
        };

        request.signal.addEventListener("abort", onAbort);

        if (request.signal.aborted) {
          abortRequested = true;
          finish();
          return;
        }

        sse("status", { status: agentic ? "launching_browser" : "thinking" });

        heartbeat = setInterval(() => {
          sse("ping", { t: Date.now() });
        }, 15000);

        // Choose streaming mode
        const { promise: claudePromise, abort } = agentic
          ? streamClaudeAgentic(agenticSystemPrompt, message, (event) => {
              if (event.type === "delta" && event.content) {
                sse("delta", { content: event.content });
              } else if (event.type === "thinking" && event.content) {
                sse("thinking", { content: event.content });
              } else if (event.type === "tool_use") {
                sse("tool_use", { toolName: event.toolName, content: event.content });
              } else if (event.type === "tool_result") {
                sse("tool_result", {
                  toolName: event.toolName,
                  result: event.toolResult,
                });
              } else if (event.type === "error") {
                sse("error", { error: event.error });
              }
            })
          : streamClaude(simplePrompt, (event) => {
              if (event.type === "delta" && event.content) {
                sse("delta", { content: event.content });
              } else if (event.type === "thinking" && event.content) {
                sse("thinking", { content: event.content });
              } else if (event.type === "error") {
                sse("error", { error: event.error });
              }
            });

        abortGeneration = abort;

        if (abortRequested) {
          abortGeneration();
          finish();
          return;
        }

        claudePromise
          .then((response) => {
            if (isClosed) return;
            logChat("Response received, length:", response.length);
            sse("complete", { content: response });
            finish();
          })
          .catch((error) => {
            if (isClosed) return;
            console.error("[Chat] Error:", error);
            sse("error", {
              error: error instanceof Error ? error.message : "Failed to get response",
            });
            finish();
          });
      },
      cancel() {
        abortRequested = true;
        if (abortGeneration) {
          abortGeneration();
        }
        if (closeStream) {
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Encoding": "none",
      },
    });
  } catch (error) {
    console.error("[Chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process chat",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
