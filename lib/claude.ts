import { spawn } from "child_process";
import path from "path";

export interface CallClaudeJSONResult {
  data: Record<string, unknown> | null;
  raw: string;
}

export interface ClaudeStreamEvent {
  type: "delta" | "done" | "error" | "thinking" | "tool_use" | "tool_result";
  content?: string;
  error?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
}

export type ClaudeEventCallback = (event: ClaudeStreamEvent) => void;

export function isClaudeDebugEnabled() {
  const flag = process.env.CLAUDE_DEBUG ?? process.env.CLAUDE_LOGS;
  if (!flag) return false;
  const normalized = flag.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function claudeLog(...args: unknown[]) {
  if (isClaudeDebugEnabled()) {
    console.log("[Claude]", ...args);
  }
}

function getClaudeEnv() {
  const { ANTHROPIC_API_KEY: _, ...envWithoutApiKey } = process.env;
  return {
    ...envWithoutApiKey,
    NODE_TLS_REJECT_UNAUTHORIZED: "0",
    PYTHONUNBUFFERED: "1",
    NODE_OPTIONS: "--no-warnings",
    FORCE_COLOR: "0",
  };
}

export interface StreamClaudeResult {
  promise: Promise<string>;
  abort: () => void;
}

export function streamClaude(
  prompt: string,
  onEvent: ClaudeEventCallback
): StreamClaudeResult {
  claudeLog("Starting streaming request...");
  claudeLog("Prompt length:", prompt.length, "chars");

  const startTime = Date.now();
  let proc: ReturnType<typeof spawn> | null = null;
  let isAborted = false;

  const abort = () => {
    if (proc && !isAborted) {
      isAborted = true;
      claudeLog("Aborting process...");
      try {
        proc.kill("SIGTERM");
      } catch {
        // Ignore kill errors
      }
    }
  };

  const promise = new Promise<string>((resolve, reject) => {
    proc = spawn(
      "claude",
      ["-p", prompt, "--output-format", "stream-json", "--verbose", "--include-partial-messages"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: getClaudeEnv(),
      }
    );

    let content = "";
    let errorOutput = "";
    let buffer = "";

    if (!proc.stdout || !proc.stderr) {
      reject(new Error("Failed to create stdout/stderr pipes"));
      return;
    }

    proc.stdout.setEncoding("utf8");

    proc.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;

        try {
          let event = JSON.parse(trimmed);
          claudeLog("Event type:", event.type);

          if (event.type === "stream_event" && event.event) {
            event = event.event;
            claudeLog("Inner event type:", event.type);
          }

          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta?.type === "text_delta" && delta.text) {
              content += delta.text;
              claudeLog("Delta received, text length:", delta.text.length);
              onEvent({ type: "delta", content: delta.text });
            } else if (delta?.type === "thinking_delta" && delta.thinking) {
              onEvent({ type: "thinking", content: delta.thinking });
            }
          }

          if (event.type === "assistant" && event.message?.content) {
            const messageText = event.message.content
              .filter(
                (block: { type?: string; text?: string }) =>
                  block.type === "text" && block.text
              )
              .map((block: { text?: string }) => block.text)
              .join("");
            if (messageText) {
              content = messageText;
            }
          }

          if (event.type === "result") {
            claudeLog("Result event received, stream complete");
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
      claudeLog("stderr:", data.toString().trim());
    });

    proc.on("close", (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      claudeLog(`Stream ended with code ${code} after ${elapsed}s`);
      claudeLog("Content length:", content.length, "chars");

      if (isAborted) {
        onEvent({ type: "error", error: "Generation aborted" });
        reject(new Error("Generation aborted"));
      } else if (code === 0 || content.length > 0) {
        onEvent({ type: "done", content: content.trim() });
        resolve(content.trim());
      } else {
        const err = `Claude exited with code ${code}: ${errorOutput}`;
        onEvent({ type: "error", error: err });
        reject(new Error(err));
      }
    });

    proc.on("error", (err) => {
      console.error("[Claude] Spawn error:", err.message);
      onEvent({ type: "error", error: err.message });
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });

  return { promise, abort };
}

/**
 * Stream Claude in full agentic mode with MCP browser tools.
 * Claude can call browser_* tools to interact with web pages.
 */
export function streamClaudeAgentic(
  systemPrompt: string,
  userMessage: string,
  onEvent: ClaudeEventCallback
): StreamClaudeResult {
  claudeLog("Starting agentic request with MCP...");
  claudeLog("System prompt length:", systemPrompt.length, "chars");
  claudeLog("User message length:", userMessage.length, "chars");

  const startTime = Date.now();
  let proc: ReturnType<typeof spawn> | null = null;
  let isAborted = false;

  const mcpConfigPath = path.join(process.cwd(), "mcp-config.json");

  const abort = () => {
    if (proc && !isAborted) {
      isAborted = true;
      claudeLog("Aborting agentic process...");
      try {
        proc.kill("SIGTERM");
      } catch {
        // Ignore kill errors
      }
    }
  };

  const promise = new Promise<string>((resolve, reject) => {
    // Build the full prompt with system context
    const fullPrompt = `${systemPrompt}\n\nUser request: ${userMessage}`;

    proc = spawn(
      "claude",
      [
        "-p", fullPrompt,
        "--output-format", "stream-json",
        "--dangerously-skip-permissions",
        "--mcp-config", mcpConfigPath,
        "--verbose",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: getClaudeEnv(),
        cwd: process.cwd(),
      }
    );

    let content = "";
    let errorOutput = "";
    let buffer = "";
    let currentToolName = "";
    let currentToolInput: Record<string, unknown> = {};

    if (!proc.stdout || !proc.stderr) {
      reject(new Error("Failed to create stdout/stderr pipes"));
      return;
    }

    proc.stdout.setEncoding("utf8");

    proc.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;

        try {
          let event = JSON.parse(trimmed);
          claudeLog("Agentic event type:", event.type);

          // Unwrap stream_event wrapper
          if (event.type === "stream_event" && event.event) {
            event = event.event;
            claudeLog("Inner event type:", event.type);
          }

          // Text content delta
          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta?.type === "text_delta" && delta.text) {
              content += delta.text;
              onEvent({ type: "delta", content: delta.text });
            } else if (delta?.type === "thinking_delta" && delta.thinking) {
              onEvent({ type: "thinking", content: delta.thinking });
            } else if (delta?.type === "input_json_delta" && delta.partial_json) {
              // Tool input streaming - accumulate
              claudeLog("Tool input delta:", delta.partial_json);
            }
          }

          // Tool use start
          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (block?.type === "tool_use") {
              currentToolName = block.name || "";
              currentToolInput = {};
              claudeLog("Tool use started:", currentToolName);
              onEvent({
                type: "tool_use",
                toolName: currentToolName,
                content: `Calling tool: ${currentToolName}`,
              });
            }
          }

          // Tool use complete - input is ready
          if (event.type === "content_block_stop" && currentToolName) {
            claudeLog("Tool use complete:", currentToolName, currentToolInput);
            currentToolName = "";
            currentToolInput = {};
          }

          // Tool result (from MCP server)
          if (event.type === "tool_result") {
            const toolName = event.tool_name || "unknown";
            const result = event.result || "";
            claudeLog("Tool result:", toolName, result.slice?.(0, 100));
            onEvent({
              type: "tool_result",
              toolName,
              toolResult: typeof result === "string" ? result : JSON.stringify(result),
              content: `Tool ${toolName} completed`,
            });
          }

          // Final assistant message
          if (event.type === "assistant" && event.message?.content) {
            const messageText = event.message.content
              .filter(
                (block: { type?: string; text?: string }) =>
                  block.type === "text" && block.text
              )
              .map((block: { text?: string }) => block.text)
              .join("");
            if (messageText) {
              content = messageText;
            }
          }

          // Result event
          if (event.type === "result") {
            claudeLog("Agentic result event received");
            if (event.result) {
              content = event.result;
            }
          }
        } catch (e) {
          claudeLog("Parse error:", e);
        }
      }
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
      claudeLog("stderr:", data.toString().trim());
    });

    proc.on("close", (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      claudeLog(`Agentic stream ended with code ${code} after ${elapsed}s`);
      claudeLog("Content length:", content.length, "chars");

      if (isAborted) {
        onEvent({ type: "error", error: "Generation aborted" });
        reject(new Error("Generation aborted"));
      } else if (code === 0 || content.length > 0) {
        onEvent({ type: "done", content: content.trim() });
        resolve(content.trim());
      } else {
        const err = `Claude exited with code ${code}: ${errorOutput}`;
        onEvent({ type: "error", error: err });
        reject(new Error(err));
      }
    });

    proc.on("error", (err) => {
      console.error("[Claude] Spawn error:", err.message);
      onEvent({ type: "error", error: err.message });
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });

  return { promise, abort };
}

/**
 * Parse raw Claude CLI output into a JSON object.
 * Tries direct parse, unwraps common wrappers, falls back to extracting first {...} block.
 */
export function parseClaudeJSON(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Direct parse
  try {
    const data = JSON.parse(trimmed);
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      for (const key of ["content", "completion", "response", "output"]) {
        if (key in data && typeof data[key] === "string") {
          try {
            const inner = JSON.parse(data[key] as string);
            if (typeof inner === "object" && inner !== null && !Array.isArray(inner)) {
              return inner as Record<string, unknown>;
            }
          } catch {
            // Not nested JSON
          }
        }
      }
      return data as Record<string, unknown>;
    }
  } catch {
    // Not valid JSON
  }

  // Fallback: extract first {...} block
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Non-streaming Claude CLI call that returns structured JSON.
 * Uses stdio: ["ignore", "pipe", "pipe"] to fix the hanging bug
 * (Python version used stdin=PIPE which caused Claude to hang waiting for input).
 */
export async function callClaudeJSON(
  prompt: string,
  schema: Record<string, unknown>,
  options?: { model?: string; timeout?: number }
): Promise<CallClaudeJSONResult> {
  const model = options?.model;
  const timeout = options?.timeout ?? 60000;

  const args = [
    "-p",
    prompt,
    "--output-format",
    "text",
    "--json-schema",
    JSON.stringify(schema),
  ];
  if (model) {
    args.push("--model", model);
  }

  claudeLog("callClaudeJSON starting", { model: model ?? "default", timeout, promptLen: prompt.length });

  return new Promise<CallClaudeJSONResult>((resolve) => {
    const proc = spawn("claude", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: getClaudeEnv(),
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      claudeLog("callClaudeJSON timed out");
      try {
        proc.kill("SIGTERM");
      } catch {
        // Ignore
      }
    }, timeout);

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      claudeLog("callClaudeJSON finished", { code, stdoutLen: stdout.length });
      if (stderr.trim()) {
        claudeLog("callClaudeJSON stderr:", stderr.trim().slice(0, 500));
      }

      if (code !== 0 && !stdout.trim()) {
        resolve({ data: null, raw: stdout });
        return;
      }

      const data = parseClaudeJSON(stdout);
      resolve({ data, raw: stdout });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      claudeLog("callClaudeJSON spawn error:", err.message);
      resolve({ data: null, raw: "" });
    });
  });
}
