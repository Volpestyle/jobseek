"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ApplyInterfaceProps {
  jobUrl: string;
  jobTitle?: string;
  company?: string;
  onClose?: () => void;
}

interface LogEntry {
  id: string;
  type: "status" | "log" | "filled" | "warning" | "error" | "complete";
  message: string;
  timestamp: Date;
}

interface PendingInput {
  field: string;
  prompt: string;
  fieldType: string;
  options?: Array<{ value: string; text: string }>;
}

export default function ApplyInterface({
  jobUrl,
  jobTitle,
  company,
  onClose,
}: ApplyInterfaceProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendingInput, setPendingInput] = useState<PendingInput | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saveAsPreference, setSaveAsPreference] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (
    type: LogEntry["type"],
    message: string
  ) => {
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
    setPendingInput(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobUrl }),
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
                setApplicationId(data.applicationId);
                addLog("status", "Application started");
              } else if (currentEventType === "message") {
                if (data.type === "status") {
                  addLog("status", data.message);
                } else if (data.type === "filled") {
                  addLog("filled", `Filled "${data.field}": ${data.value}`);
                } else if (data.type === "warning") {
                  addLog("warning", data.message);
                } else if (data.type === "error") {
                  addLog("error", data.message);
                  setError(data.message);
                } else if (data.type === "complete") {
                  addLog("complete", data.message);
                  setIsComplete(true);
                } else if (data.type === "NEED_INPUT") {
                  setPendingInput({
                    field: data.field,
                    prompt: data.prompt,
                    fieldType: data.field_type,
                    options: data.options,
                  });
                }
              } else if (currentEventType === "log") {
                addLog("log", data.message);
              } else if (currentEventType === "preference_saved") {
                addLog("status", `Saved preference: ${data.category}`);
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

  const submitInput = async () => {
    if (!pendingInput || !inputValue.trim() || !applicationId) return;

    try {
      await fetch("/api/apply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          field: pendingInput.field,
          value: inputValue,
          savePreference: saveAsPreference,
        }),
      });

      addLog("filled", `Provided "${pendingInput.field}": ${inputValue}`);
      setPendingInput(null);
      setInputValue("");
    } catch (err) {
      addLog("error", "Failed to submit input");
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
      case "filled":
        return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
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
          <div className="flex items-center gap-2">
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
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                Close
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
                  log.type === "filled" && "text-primary",
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

      {/* Input prompt area */}
      <AnimatePresence>
        {pendingInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-primary/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Input Required</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {pendingInput.prompt}
              </p>

              <div className="flex gap-2">
                {pendingInput.options && pendingInput.options.length > 0 ? (
                  <Select value={inputValue} onValueChange={setInputValue}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingInput.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter your answer..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        submitInput();
                      }
                    }}
                  />
                )}
                <Button
                  onClick={submitInput}
                  disabled={!inputValue.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-pref"
                  checked={saveAsPreference}
                  onCheckedChange={(checked) =>
                    setSaveAsPreference(checked as boolean)
                  }
                />
                <label
                  htmlFor="save-pref"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Save as preference for future applications
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status bar */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Application in progress...
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
