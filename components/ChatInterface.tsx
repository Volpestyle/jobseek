"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Brain,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Loader2,
  Bookmark,
  BookmarkPlus,
  Play,
  Briefcase,
  Globe,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Markdown from "react-markdown";
import {
  ChatMessage,
  ChatAction,
  SavedPreferenceAction,
  ApplyJobAction,
  ToolCallAction,
} from "@/lib/chat-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  salary: string | null;
  posted: string | null;
}

interface ChatInterfaceProps {
  jobs: Job[];
  searchFilter?: string;
  pendingMessage?: string;
  onPendingMessageConsumed?: () => void;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function ActionCard({ action }: { action: ChatAction }) {
  if (action.type === "preference") {
    const pref = action as SavedPreferenceAction;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-start gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5"
      >
        <div className="p-1.5 rounded-md bg-green-500/10">
          <BookmarkPlus className="h-3.5 w-3.5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-green-500 tracking-wider">
              PREFERENCE SAVED
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-green-500/10 text-green-500/80">
              {pref.category}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{pref.question}</p>
          <p className="text-sm text-foreground font-medium mt-0.5 truncate">{pref.answer}</p>
        </div>
      </motion.div>
    );
  }

  if (action.type === "apply") {
    const apply = action as ApplyJobAction;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5"
      >
        <div className="p-1.5 rounded-md bg-primary/10">
          <Briefcase className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-primary tracking-wider">
              APPLYING TO JOB
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary/10 text-primary/80">
              #{apply.jobIndex}
            </span>
          </div>
          {apply.jobTitle && (
            <p className="text-sm text-foreground font-medium truncate">{apply.jobTitle}</p>
          )}
          {apply.company && (
            <p className="text-xs text-muted-foreground truncate">{apply.company}</p>
          )}
        </div>
        <Play className="h-4 w-4 text-primary shrink-0" />
      </motion.div>
    );
  }

  if (action.type === "tool_call") {
    const tool = action as ToolCallAction;
    const statusIcon =
      tool.status === "running" ? (
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      ) : tool.status === "completed" ? (
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      ) : (
        <AlertCircle className="h-3 w-3 text-red-500" />
      );

    const statusColor =
      tool.status === "running"
        ? "border-blue-500/20 bg-blue-500/5"
        : tool.status === "completed"
          ? "border-green-500/20 bg-green-500/5"
          : "border-red-500/20 bg-red-500/5";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-start gap-3 p-3 rounded-lg border", statusColor)}
      >
        <div className="p-1.5 rounded-md bg-blue-500/10">
          <Globe className="h-3.5 w-3.5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-blue-500 tracking-wider">BROWSER</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-500/80">
              {tool.toolName.replace("browser_", "")}
            </span>
            {statusIcon}
          </div>
          {tool.result && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{tool.result}</p>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const [showThinking, setShowThinking] = useState(false);
  const isUser = message.role === "user";

  if (!isUser && !message.content && (!message.actions || message.actions.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[85%]", isUser ? "" : "w-full")}>
        {!isUser && message.thinking && (
          <div className="mb-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Brain className="h-3 w-3" />
              <span className="font-mono text-[10px] tracking-wide">REASONING</span>
              {showThinking ? (
                <ChevronDown className="h-2.5 w-2.5" />
              ) : (
                <ChevronRight className="h-2.5 w-2.5" />
              )}
            </button>
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {message.thinking}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {isUser ? (
          <div className="inline-block rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {message.content && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-foreground prose-headings:font-medium prose-headings:mt-4 prose-headings:mb-2
                prose-p:text-muted-foreground prose-p:text-sm prose-p:my-2 prose-p:leading-relaxed
                prose-li:text-muted-foreground prose-li:text-sm prose-li:my-0.5
                prose-strong:text-foreground prose-code:text-primary prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-muted prose-pre:p-3 prose-pre:my-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-border
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
              >
                <Markdown>{message.content}</Markdown>
              </div>
            )}
            {message.actions && message.actions.length > 0 && (
              <div className="space-y-2 pt-2">
                {message.actions.map((action, i) => (
                  <ActionCard key={i} action={action} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3"
    >
      <div className="relative h-4 w-4">
        <div className="absolute inset-0 rounded-full border-2 border-muted border-t-primary animate-spin" />
      </div>
      <span className="text-xs text-muted-foreground font-mono tracking-wide">
        thinking...
      </span>
    </motion.div>
  );
}

export default function ChatInterface({
  jobs,
  searchFilter,
  pendingMessage,
  onPendingMessageConsumed,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [, setThinkingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingSubmitRef = useRef<string | null>(null);

  // Filter jobs based on search filter from JobTable
  const filteredJobs = searchFilter
    ? jobs.filter((j) => {
        const q = searchFilter.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          (j.salary && j.salary.toLowerCase().includes(q))
        );
      })
    : jobs;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle pending message from parent (e.g. clicking APPLY on a job)
  useEffect(() => {
    if (pendingMessage && !isStreaming) {
      pendingSubmitRef.current = pendingMessage;
      setInputValue(pendingMessage);
      onPendingMessageConsumed?.();
    }
  }, [pendingMessage, isStreaming, onPendingMessageConsumed]);

  // Auto-submit when pendingSubmitRef is set and inputValue matches
  useEffect(() => {
    if (pendingSubmitRef.current && inputValue === pendingSubmitRef.current && !isStreaming) {
      pendingSubmitRef.current = null;
      // Small delay so user sees what's being sent
      const timer = setTimeout(() => handleSubmit(), 150);
      return () => clearTimeout(timer);
    }
  }, [inputValue, isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const parsePreferences = (
    content: string
  ): { cleaned: string; actions: SavedPreferenceAction[] } => {
    const prefRegex =
      /\[SAVE_PREFERENCE:\s*category="([^"]+)",\s*q="([^"]+)",\s*a="([^"]+)"\]/g;
    const actions: SavedPreferenceAction[] = [];

    let match: RegExpExecArray | null;
    while ((match = prefRegex.exec(content)) !== null) {
      const [, category, question, answer] = match;
      actions.push({ type: "preference", category, question, answer });
      fetch("/api/chat/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, category }),
      }).catch(console.error);
    }

    return { cleaned: content.replace(prefRegex, "").trim(), actions };
  };

  const parseApplyCommands = (
    content: string
  ): { cleaned: string; actions: ApplyJobAction[] } => {
    const applyRegex = /\[APPLY_JOB:\s*(\d+)\]/g;
    const actions: ApplyJobAction[] = [];

    let match: RegExpExecArray | null;
    while ((match = applyRegex.exec(content)) !== null) {
      const jobIndex = parseInt(match[1], 10);
      const arrayIndex = jobIndex - 1;
      const job = filteredJobs[arrayIndex];

      actions.push({
        type: "apply",
        jobIndex,
        jobTitle: job?.title,
        company: job?.company,
      });
    }

    return { cleaned: content.replace(applyRegex, "").trim(), actions };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isStreaming) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);
    setThinkingContent("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    abortControllerRef.current = new AbortController();

    const assistantId = generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      thinking: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
      actions: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      let buffer = "";
      let currentContent = "";
      let currentThinking = "";
      let currentEventType = "";
      let currentActions: ChatAction[] = [];
      let rafId: number | null = null;

      const flush = () => {
        rafId = null;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: currentContent,
                  thinking: currentThinking,
                  actions: currentActions.length > 0 ? [...currentActions] : undefined,
                }
              : msg
          )
        );
      };

      const scheduleFlush = () => {
        if (rafId === null) {
          rafId = requestAnimationFrame(flush);
        }
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedInput,
          history: nextHistory,
          jobs: filteredJobs,
          agentic: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();

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

              if (currentEventType === "delta" && data.content) {
                currentContent += data.content;
                scheduleFlush();
              }

              if (currentEventType === "thinking" && data.content) {
                currentThinking += data.content;
                setThinkingContent(currentThinking);
                scheduleFlush();
              }

              // Handle tool use events
              if (currentEventType === "tool_use" && data.toolName) {
                currentActions.push({
                  type: "tool_call",
                  toolName: data.toolName,
                  status: "running",
                } as ToolCallAction);
                scheduleFlush();
              }

              // Handle tool result events
              if (currentEventType === "tool_result" && data.toolName) {
                // Update the last tool action with result
                const lastToolIdx = currentActions.findLastIndex(
                  (a) => a.type === "tool_call" && (a as ToolCallAction).toolName === data.toolName
                );
                if (lastToolIdx >= 0) {
                  const toolAction = currentActions[lastToolIdx] as ToolCallAction;
                  currentActions[lastToolIdx] = {
                    ...toolAction,
                    status: "completed",
                    result: data.result?.slice?.(0, 100) || "Done",
                  };
                }
                scheduleFlush();
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch {
              // Ignore parse errors for partial data
            }
          }
        }
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Parse and save any preferences, handle apply commands
      const prefResult = parsePreferences(currentContent);
      const applyResult = parseApplyCommands(prefResult.cleaned);
      const allActions: ChatAction[] = [
        ...currentActions,
        ...prefResult.actions,
        ...applyResult.actions,
      ];

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: applyResult.cleaned,
                thinking: currentThinking,
                isStreaming: false,
                actions: allActions.length > 0 ? allActions : undefined,
              }
            : msg
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: "Sorry, I encountered an error. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
    setThinkingContent("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const lastMessage = messages[messages.length - 1];
  const showThinkingIndicator =
    isStreaming && lastMessage?.role === "assistant" && !lastMessage?.content;

  return (
    <div className="flex flex-col h-[600px] cyber-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <span className="terminal-label">JOB ASSISTANT</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="space-y-3">
              <p className="font-mono text-sm text-muted-foreground">
                Ask me about your job search...
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Which jobs match my skills?",
                  "Show me remote positions",
                  "Apply to job #1",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="px-3 py-1.5 rounded-full border border-border bg-muted/30 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <AnimatePresence>
              {showThinkingIndicator && <ThinkingIndicator />}
            </AnimatePresence>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-background/50 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 p-2 rounded-xl border border-border/50 bg-muted/30 focus-within:bg-muted/50 focus-within:border-primary/20 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-sm hover:border-primary/10 hover:shadow-md"
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about jobs, or say 'apply to job #3'..."
            disabled={isStreaming}
            rows={1}
            className="w-full resize-none bg-transparent border-none px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 transition-colors disabled:opacity-50 min-h-[48px]"
            style={{ maxHeight: "150px" }}
          />
          <div className="absolute right-2 bottom-2">
            <Button
              type="submit"
              disabled={!inputValue.trim() || isStreaming}
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 rounded-lg transition-all duration-200",
                inputValue.trim()
                  ? "bg-primary text-primary-foreground shadow-sm opacity-100 transform scale-100"
                  : "bg-transparent text-muted-foreground hover:bg-muted opacity-50 transform scale-95"
              )}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
        <p className="text-[10px] text-muted-foreground/40 mt-2 text-center font-mono">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
