"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import KanbanColumn from "./KanbanColumn";
import { KanbanCardOverlay, type KanbanCardData } from "./KanbanCard";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-types";

interface KanbanBoardProps {
  entries: KanbanCardData[];
  onRefresh: () => void;
}

export default function KanbanBoard({ entries, onRefresh }: KanbanBoardProps) {
  const [items, setItems] = useState(entries);
  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);

  // Sync when parent entries change
  if (entries !== items && !activeCard) {
    setItems(entries);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const cardsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = items.filter((e) => e.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, KanbanCardData[]>
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = items.find((e) => e.link === event.active.id);
    setActiveCard(card ?? null);
  }, [items]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveCard(null);
      const { active, over } = event;
      if (!over) return;

      const newStage = over.id as PipelineStage;
      const link = active.id as string;
      const card = items.find((e) => e.link === link);
      if (!card || card.stage === newStage) return;

      // Optimistic update
      const prev = items;
      setItems((cur) =>
        cur.map((e) => (e.link === link ? { ...e, stage: newStage } : e))
      );

      try {
        const res = await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link, stage: newStage }),
        });
        if (!res.ok) throw new Error("Failed to update");
        onRefresh();
      } catch {
        // Revert on error
        setItems(prev);
      }
    },
    [items, onRefresh]
  );

  const handleRemove = useCallback(
    async (link: string) => {
      const prev = items;
      setItems((cur) => cur.filter((e) => e.link !== link));

      try {
        const res = await fetch(
          `/api/pipeline?link=${encodeURIComponent(link)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to remove");
        onRefresh();
      } catch {
        setItems(prev);
      }
    },
    [items, onRefresh]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            cards={cardsByStage[stage]}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCardOverlay data={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
