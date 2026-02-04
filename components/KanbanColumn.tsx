"use client";

import { useDroppable } from "@dnd-kit/core";
import KanbanCard, { type KanbanCardData } from "./KanbanCard";
import type { PipelineStage } from "@/lib/pipeline-types";

const STAGE_CONFIG: Record<PipelineStage, { label: string; className: string }> = {
  interested: { label: "INTERESTED", className: "stage-interested" },
  applied: { label: "APPLIED", className: "stage-applied" },
  interview: { label: "INTERVIEW", className: "stage-interview" },
  offer: { label: "OFFER", className: "stage-offer" },
  rejected: { label: "REJECTED", className: "stage-rejected" },
};

interface KanbanColumnProps {
  stage: PipelineStage;
  cards: KanbanCardData[];
  onRemove: (link: string) => void;
}

export default function KanbanColumn({ stage, cards, onRemove }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const config = STAGE_CONFIG[stage];

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column flex flex-col rounded-lg ${config.className} ${
        isOver ? "kanban-drop-active" : "bg-card/50"
      } border border-border/50 w-[280px] shrink-0 transition-colors`}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="terminal-label">{config.label}</span>
          <span className="font-mono text-[10px] text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {cards.map((card) => (
          <KanbanCard key={card.link} data={card} onRemove={onRemove} />
        ))}
        {cards.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground/30">
            <span className="font-mono text-[10px]">DROP HERE</span>
          </div>
        )}
      </div>
    </div>
  );
}
