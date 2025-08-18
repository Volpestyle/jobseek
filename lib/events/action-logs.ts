import { EventEmitter } from "events";

export interface ActionLog {
  id: string;
  sessionId: string;
  timestamp: string;
  action: string;
  type:
    | "act"
    | "extract"
    | "observe"
    | "navigate"
    | "scroll"
    | "error"
    | "info"
    | "debug";
  details?: string;
  status: "pending" | "success" | "error";
}

export interface JobResult {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
  source: string;
  postedDate?: string;
}

class ActionLogEmitter extends EventEmitter {
  private static instance: ActionLogEmitter;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ActionLogEmitter();
      this.instance.setMaxListeners(100);
    }
    return this.instance;
  }

  emitLog(sessionId: string, log: ActionLog) {
    this.emit(`session:${sessionId}:log`, log);
  }

  emitJobUpdate(sessionId: string, jobs: JobResult[]) {
    this.emit(`session:${sessionId}:jobs`, jobs);
  }

  emitTotalJobsUpdate(sessionId: string, totalJobs: number) {
    this.emit(`session:${sessionId}:totalJobs`, totalJobs);
  }

  subscribeToSession(
    sessionId: string,
    handlers: {
      onLog?: (log: ActionLog) => void;
      onJobs?: (jobs: JobResult[]) => void;
      onTotalJobs?: (totalJobs: number) => void;
    }
  ) {
    if (handlers.onLog) {
      this.on(`session:${sessionId}:log`, handlers.onLog);
    }
    if (handlers.onJobs) {
      this.on(`session:${sessionId}:jobs`, handlers.onJobs);
    }
    if (handlers.onTotalJobs) {
      this.on(`session:${sessionId}:totalJobs`, handlers.onTotalJobs);
    }

    return () => {
      if (handlers.onLog) {
        this.off(`session:${sessionId}:log`, handlers.onLog);
      }
      if (handlers.onJobs) {
        this.off(`session:${sessionId}:jobs`, handlers.onJobs);
      }
      if (handlers.onTotalJobs) {
        this.off(`session:${sessionId}:totalJobs`, handlers.onTotalJobs);
      }
    };
  }
}

export const actionLogEmitter = ActionLogEmitter.getInstance();
