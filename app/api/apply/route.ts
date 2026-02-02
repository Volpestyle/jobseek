import { NextRequest } from "next/server";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { getChatPreferences, saveChatPreference } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ApplyRequest {
  jobUrl: string;
}

interface ApplicationState {
  proc: ChildProcess;
  pendingInput: string | null;
}

// Track running applications
const runningApplications = new Map<string, ApplicationState>();

export async function POST(request: NextRequest) {
  try {
    const body: ApplyRequest = await request.json();
    const { jobUrl } = body;

    if (!jobUrl) {
      return new Response(JSON.stringify({ error: "Job URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get existing preferences to pass to script
    const dbPreferences = getChatPreferences();
    const preferences: Record<string, string> = {};
    for (const pref of dbPreferences) {
      if (pref.category) {
        preferences[pref.category] = pref.answer;
      }
    }

    const scriptPath = path.join(process.cwd(), "scripts", "apply_job.py");
    const encoder = new TextEncoder();
    let closeStream: (() => void) | null = null;
    let proc: ChildProcess | null = null;

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        let onAbort: (() => void) | null = null;

        const finish = () => {
          if (isClosed) return;
          isClosed = true;
          if (onAbort) {
            request.signal.removeEventListener("abort", onAbort);
          }
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
          } catch {
            finish();
          }
        };

        onAbort = () => {
          if (proc) {
            proc.kill("SIGTERM");
          }
          finish();
        };

        request.signal.addEventListener("abort", onAbort);

        if (request.signal.aborted) {
          finish();
          return;
        }

        // Spawn the Python script
        proc = spawn("python3", [
          scriptPath,
          "--job-url",
          jobUrl,
          "--preferences",
          JSON.stringify(preferences),
        ], {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            PYTHONUNBUFFERED: "1",
          },
        });

        const applicationId = `app-${Date.now()}`;
        runningApplications.set(applicationId, { proc, pendingInput: null });

        sse("start", { applicationId });

        let stdoutBuffer = "";

        proc.stdout?.on("data", (chunk: Buffer) => {
          stdoutBuffer += chunk.toString();
          const lines = stdoutBuffer.split("\n");
          stdoutBuffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);

              // Handle save_preference events
              if (data.type === "save_preference") {
                saveChatPreference(data.question, data.answer, data.category);
                sse("preference_saved", {
                  category: data.category,
                  question: data.question,
                  answer: data.answer,
                });
                continue;
              }

              sse("message", data);
            } catch {
              // Non-JSON output, treat as status
              sse("log", { message: line });
            }
          }
        });

        proc.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString().trim();
          if (text) {
            sse("log", { message: text });
          }
        });

        proc.on("close", (code) => {
          runningApplications.delete(applicationId);
          sse("complete", { code, applicationId });
          finish();
        });

        proc.on("error", (err) => {
          runningApplications.delete(applicationId);
          sse("error", { message: err.message });
          finish();
        });
      },
      cancel() {
        if (proc) {
          proc.kill("SIGTERM");
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
    console.error("[Apply] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to start application",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Endpoint to send input to a running application
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, field, value, savePreference } = body;

    const state = runningApplications.get(applicationId);
    if (!state) {
      return new Response(
        JSON.stringify({ error: "Application not found or already completed" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const input = JSON.stringify({ field, value, save_preference: savePreference }) + "\n";
    state.proc.stdin?.write(input);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send input",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
