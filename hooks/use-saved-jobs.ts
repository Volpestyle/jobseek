"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { SavedJob } from "@/lib/storage/storage.service";

export function useSavedJobs() {
  const { storage, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load jobs on mount and when storage changes
  const loadJobs = useCallback(async () => {
    if (!storage || authLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const savedJobs = await storage.getSavedJobs();
      setJobs(savedJobs);
    } catch (err) {
      console.error("Failed to load saved jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [storage, authLoading]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Save a job
  const saveJob = useCallback(
    async (job: Omit<SavedJob, "userId" | "savedAt">) => {
      if (!storage) return;

      try {
        const savedJob = await storage.saveJob(job);
        // Add to local state immediately for optimistic UI
        setJobs((prev) => [...prev, savedJob]);
      } catch (err) {
        console.error("Failed to save job:", err);
        // Reload jobs to ensure consistency
        await loadJobs();
        throw err;
      }
    },
    [storage, loadJobs]
  );

  // Delete a job
  const deleteJob = useCallback(
    async (jobId: string) => {
      if (!storage) return;

      try {
        await storage.deleteSavedJob(jobId);
        // Remove from local state immediately for optimistic UI
        setJobs((prev) => prev.filter((job) => job.jobId !== jobId));
      } catch (err) {
        console.error("Failed to delete job:", err);
        // Reload jobs to ensure consistency
        await loadJobs();
        throw err;
      }
    },
    [storage, loadJobs]
  );

  return {
    jobs,
    isLoading: isLoading || authLoading,
    error,
    saveJob,
    deleteJob,
    refreshJobs: loadJobs,
  };
}
