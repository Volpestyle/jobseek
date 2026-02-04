"use client";

import { useDraggable } from "@dnd-kit/core";
import { ArrowUpRight, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Job, PipelineStage } from "@/lib/pipeline-types";

export interface KanbanCardData {
  link: string;
  stage: PipelineStage;
  notes: string | null;
  added_at: string;
  updated_at: string;
  job: Job | null;
}

interface KanbanCardProps {
  data: KanbanCardData;
  onRemove: (link: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function KanbanCard({ data, onRemove }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: data.link });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const job = data.job;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cyber-card p-3 transition-shadow group ${
        isDragging ? "kanban-card-dragging z-50" : "cursor-grab active:cursor-grabbing"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-xs font-medium text-foreground truncate">
            {job?.title ?? "Unknown position"}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-primary/80 truncate">
              {job?.company ?? "Unknown"}
            </span>
          </div>
          {job?.location && (
            <div className="text-[10px] text-muted-foreground truncate">
              {job.location}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {job?.salary && (
              <span className="inline-flex items-center rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[9px] text-primary truncate">
                {job.salary}
              </span>
            )}
            <span className="font-mono text-[9px] text-muted-foreground/50 shrink-0">
              {timeAgo(data.updated_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {job?.link && (
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        <button
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(data.link);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// Lightweight overlay card for drag state
export function KanbanCardOverlay({ data }: { data: KanbanCardData }) {
  const job = data.job;
  return (
    <div className="cyber-card p-3 kanban-card-dragging w-[264px]">
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-xs font-medium text-foreground truncate">
            {job?.title ?? "Unknown position"}
          </div>
          <span className="font-mono text-[10px] text-primary/80 truncate block">
            {job?.company ?? "Unknown"}
          </span>
        </div>
      </div>
    </div>
  );
}
