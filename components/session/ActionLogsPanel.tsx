"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MousePointer,
  Type,
  Eye,
  Database,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface ActionLog {
  id: string;
  timestamp: string;
  action: string;
  type:
    | "act"
    | "extract"
    | "observe"
    | "navigate"
    | "scroll"
    | "error"
    | "info";
  details?: string;
  status?: "pending" | "success" | "error";
}

interface ActionLogsPanelProps {
  logs: ActionLog[];
  isLoading: boolean;
  sessionStatus?: string;
}

export function ActionLogsPanel({
  logs,
  isLoading,
  sessionStatus,
}: ActionLogsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (bottomRef.current && sessionStatus === "RUNNING") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, sessionStatus]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "act":
        return <MousePointer className="h-3 w-3" />;
      case "extract":
        return <Database className="h-3 w-3" />;
      case "observe":
        return <Eye className="h-3 w-3" />;
      case "navigate":
        return <Search className="h-3 w-3" />;
      case "scroll":
        return <ArrowDown className="h-3 w-3" />;
      case "error":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Type className="h-3 w-3" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "act":
        return "text-blue-600 bg-blue-50";
      case "extract":
        return "text-green-600 bg-green-50";
      case "observe":
        return "text-purple-600 bg-purple-50";
      case "navigate":
        return "text-indigo-600 bg-indigo-50";
      case "scroll":
        return "text-gray-600 bg-gray-50";
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No actions logged yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="border-l-2 border-gray-200 pl-3 pb-3 last:pb-0"
          >
            <div className="flex items-start gap-2">
              <div className={`p-1 rounded ${getActionColor(log.type)}`}>
                {getActionIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {getStatusIcon(log.status)}
                </div>
                <p className="text-sm font-medium mt-1">{log.action}</p>
                {log.details && (
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    {log.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {sessionStatus === "RUNNING" && (
          <div className="flex items-center gap-2 pt-2">
            <div className="animate-pulse">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Running...
              </Badge>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
