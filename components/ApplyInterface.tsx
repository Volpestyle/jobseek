"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ApplyInterfaceProps {
  jobUrl: string;
  jobTitle?: string;
  company?: string;
}

interface LogEntry {
  id: string;
  type: "status" | "log" | "tool_use" | "tool_result" | "warning" | "error" | "complete";
  message: string;
  timestamp: Date;
}

export default function ApplyInterface({
  jobUrl,
  jobTitle,
  company,
}: ApplyInterfaceProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [headless, setHeadless] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        message,
        timestamp: new Date(),
      },
    ]);
  };

  const startApplication = async () => {
    setIsRunning(true);
    setIsComplete(false);
    setError(null);
    setLogs([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobUrl, showBrowser: !headless }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to start application");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (currentEventType === "start") {
                addLog("status", "Application started — Claude is taking over");
              } else if (currentEventType === "message") {
                if (data.type === "status") {
                  addLog("status", data.message);
                } else if (data.type === "tool_use") {
                  addLog("tool_use", data.message);
                } else if (data.type === "tool_result") {
                  addLog("tool_result", data.message);
                } else if (data.type === "warning") {
                  addLog("warning", data.message);
                } else if (data.type === "error") {
                  addLog("error", data.message);
                  setError(data.message);
                } else if (data.type === "complete") {
                  addLog("complete", data.message);
                  setIsComplete(true);
                }
              } else if (currentEventType === "log") {
                addLog("log", data.message);
              } else if (currentEventType === "complete") {
                if (data.code === 0) {
                  addLog("complete", "Application process completed");
                } else {
                  addLog("warning", `Process exited with code ${data.code}`);
                }
                setIsComplete(true);
              } else if (currentEventType === "error") {
                addLog("error", data.message);
                setError(data.message);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        addLog("warning", "Application cancelled");
      } else {
        const message = err instanceof Error ? err.message : "Unknown error";
        addLog("error", message);
        setError(message);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const stopApplication = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "complete":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      case "warning":
        return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
      case "tool_use":
        return <Wrench className="h-3.5 w-3.5 text-blue-500" />;
      case "tool_result":
        return <CheckCircle className="h-3.5 w-3.5 text-blue-400" />;
      default:
        return <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="cyber-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="terminal-label">APPLY TO JOB</span>
            {jobTitle && (
              <p className="text-sm font-medium mt-1 truncate max-w-md">
                {jobTitle}
                {company && (
                  <span className="text-muted-foreground"> at {company}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="headless-toggle"
                checked={headless}
                onCheckedChange={(checked) => setHeadless(checked as boolean)}
                disabled={isRunning}
              />
              <label
                htmlFor="headless-toggle"
                className={cn(
                  "text-xs text-muted-foreground cursor-pointer select-none",
                  isRunning && "opacity-60 cursor-not-allowed"
                )}
              >
                Headless
              </label>
            </div>
            {!isRunning && !isComplete && (
              <Button onClick={startApplication} size="sm">
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {isRunning && (
              <Button
                onClick={stopApplication}
                variant="destructive"
                size="sm"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Logs area */}
      <div className="h-64 overflow-y-auto p-4 space-y-2 bg-muted/20">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-mono">
              Click Start to begin the application process
            </p>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-start gap-2 font-mono text-xs",
                  log.type === "error" && "text-destructive",
                  log.type === "warning" && "text-amber-500",
                  log.type === "complete" && "text-green-500",
                  log.type === "tool_use" && "text-blue-500",
                  log.type === "tool_result" && "text-blue-400",
                  (log.type === "status" || log.type === "log") &&
                    "text-muted-foreground"
                )}
              >
                {getLogIcon(log.type)}
                <span className="text-muted-foreground/50">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="flex-1">{log.message}</span>
              </motion.div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Claude is applying...
              </span>
            </>
          )}
          {isComplete && !error && (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">
                Application completed
              </span>
            </>
          )}
          {error && (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span className="text-xs text-destructive">
                Application failed
              </span>
            </>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/50 truncate max-w-xs">
          {jobUrl}
        </span>
      </div>
    </div>
  );
}
