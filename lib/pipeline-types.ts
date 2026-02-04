export const PIPELINE_STAGES = ["interested", "applied", "interview", "offer", "rejected"] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

export interface PipelineEntry {
  id: number;
  link: string;
  stage: PipelineStage;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

export interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  salary: string | null;
  posted: string | null;
  description?: string | null;
  summary?: string | null;
  extracted?: Record<string, string | string[] | null> | null;
}

export interface HydratedPipelineEntry {
  pipeline: PipelineEntry;
  job: Job | null;
}
