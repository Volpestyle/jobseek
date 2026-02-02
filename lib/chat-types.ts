export interface SavedPreferenceAction {
  type: "preference";
  category: string;
  question: string;
  answer: string;
}

export interface ApplyJobAction {
  type: "apply";
  jobIndex: number;
  jobTitle?: string;
  company?: string;
}

export interface ToolCallAction {
  type: "tool_call";
  toolName: string;
  status: "running" | "completed" | "error";
  result?: string;
}

export type ChatAction = SavedPreferenceAction | ApplyJobAction | ToolCallAction;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  timestamp: string;
  isStreaming?: boolean;
  actions?: ChatAction[];
}

export interface ChatPreference {
  id: number;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
}
