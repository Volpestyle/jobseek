import { NextRequest } from "next/server";
import { getChatPreferences, addToPipeline } from "@/lib/db";
import { streamClaudeAgentic, type ClaudeStreamEvent } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobUrl } = body as { jobUrl: string; showBrowser?: boolean };
    const showBrowser = body.showBrowser ?? true;

    if (!jobUrl) {
      return new Response(JSON.stringify({ error: "Job URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const linkedinEmail = process.env.LINKEDIN_EMAIL || "";
    const linkedinPassword = process.env.LINKEDIN_PASSWORD || "";

    if (!linkedinEmail || !linkedinPassword) {
      return new Response(
        JSON.stringify({
          error: "Missing LINKEDIN_EMAIL or LINKEDIN_PASSWORD env vars",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build preferences context from DB
    const dbPreferences = getChatPreferences();
    const prefsLines = dbPreferences.map(
      (p) => `- ${p.question}: ${p.answer}`
    );
    const prefsBlock =
      prefsLines.length > 0
        ? `User preferences (use these to fill form fields):\n${prefsLines.join("\n")}`
        : "No saved preferences. Fill fields with reasonable defaults or leave optional fields empty.";

    const systemPrompt = `You are a job application assistant. You will use the browser tools to apply to a LinkedIn job posting.

LinkedIn credentials (use these to log in):
- Email: ${linkedinEmail}
- Password: ${linkedinPassword}

${prefsBlock}

Instructions:
1. Launch the browser (headless: ${!showBrowser})
2. Navigate to https://www.linkedin.com/login
3. Log in using the credentials above (type them into the form fields)
4. Navigate to the job URL: ${jobUrl}
5. Look for the "Easy Apply" button and click it
6. Fill out the application form using the saved preferences
7. For each form step, fill all fields, then click Next/Continue
8. When you reach the final step, click Submit
9. Close the browser when done

Important:
- Take screenshots frequently to see what's on the page
- Use browser_get_elements to find form fields
- If a field has a dropdown, use browser_select
- Type slowly and wait between actions to avoid detection
- If you encounter a CAPTCHA, report it and stop
- Report each action you take so the user can follow along`;

    const userMessage = `Apply to this LinkedIn job: ${jobUrl}`;

    const encoder = new TextEncoder();
    let abortFn: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const finish = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch {
            // Ignore
          }
        };

        const sse = (event: string, data: unknown) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            finish();
          }
        };

        const onAbort = () => {
          abortFn?.();
          finish();
        };

        request.signal.addEventListener("abort", onAbort);

        if (request.signal.aborted) {
          finish();
          return;
        }

        const onEvent = (event: ClaudeStreamEvent) => {
          switch (event.type) {
            case "delta":
              sse("message", { type: "status", message: event.content });
              break;
            case "thinking":
              sse("log", { message: `[thinking] ${event.content}` });
              break;
            case "tool_use":
              sse("message", {
                type: "tool_use",
                tool: event.toolName,
                message: event.content,
              });
              break;
            case "tool_result":
              sse("message", {
                type: "tool_result",
                tool: event.toolName,
                message: event.content,
              });
              break;
            case "done":
              addToPipeline(jobUrl, "applied");
              sse("message", {
                type: "complete",
                message: "Application process completed",
              });
              sse("complete", { code: 0 });
              finish();
              break;
            case "error":
              sse("message", { type: "error", message: event.error });
              sse("error", { message: event.error });
              finish();
              break;
          }
        };

        sse("start", { applicationId: `app-${Date.now()}` });

        const result = streamClaudeAgentic(systemPrompt, userMessage, onEvent);
        abortFn = result.abort;

        result.promise.catch((err) => {
          if (!isClosed) {
            sse("error", {
              message: err instanceof Error ? err.message : "Unknown error",
            });
            finish();
          }
        });
      },
      cancel() {
        abortFn?.();
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
    console.error("[Apply] Error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to start application",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
