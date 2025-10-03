import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import type { SavedJob } from "@/lib/storage/storage.service";

type SaveJobInput = Omit<SavedJob, "userId" | "savedAt">;

export function useSavedJobs() {
  const { storage, isLoading: authLoading, isAuthenticated, userId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo<(string | undefined)[]>(
    () => ["savedJobs", isAuthenticated ? userId ?? "authenticated" : "anonymous"],
    [isAuthenticated, userId]
  );

  const savedJobsQuery = useQuery<SavedJob[]>({
    queryKey,
    enabled: !authLoading && !!storage,
    queryFn: async () => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      return storage.getSavedJobs();
    },
    staleTime: 30_000,
  });

  const saveJobMutation = useMutation({
    mutationFn: async (job: SaveJobInput) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      return storage.saveJob(job);
    },
    onSuccess: (savedJob) => {
      queryClient.setQueryData<SavedJob[] | undefined>(queryKey, (data) => {
        const existing = data ?? [];
        const withoutDuplicate = existing.filter(
          (job) => job.jobId !== savedJob.jobId
        );
        return [...withoutDuplicate, savedJob];
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      await storage.deleteSavedJob(jobId);
      return jobId;
    },
    onSuccess: (jobId) => {
      queryClient.setQueryData<SavedJob[] | undefined>(queryKey, (data) => {
        if (!data) return data;
        return data.filter((job) => job.jobId !== jobId);
      });
    },
  });

  const error = savedJobsQuery.error
    ? savedJobsQuery.error instanceof Error
      ? savedJobsQuery.error.message
      : "Failed to load jobs"
    : null;

  const refreshJobs = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const saveJob = async (job: SaveJobInput) => {
    const result = await saveJobMutation.mutateAsync(job);
    return result;
  };

  const deleteJob = async (jobId: string) => {
    await deleteJobMutation.mutateAsync(jobId);
  };

  return {
    jobs: savedJobsQuery.data ?? [],
    isLoading: authLoading || savedJobsQuery.isLoading,
    error,
    saveJob,
    deleteJob,
    refreshJobs,
  };
}
