import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import type { JobApplication } from "@/lib/db/dynamodb.service";

type NewApplicationInput = Omit<
  JobApplication,
  "userId" | "applicationId" | "appliedAt"
>;

type UpdateApplicationInput = {
  applicationId: string;
  status: JobApplication["status"];
  notes?: string;
};

export function useJobApplications() {
  const { storage, isLoading: authLoading, isAuthenticated, userId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo<(string | undefined)[]>(
    () => ["jobApplications", isAuthenticated ? userId ?? "authenticated" : "anonymous"],
    [isAuthenticated, userId]
  );

  const applicationsQuery = useQuery<JobApplication[]>({
    queryKey,
    enabled: !authLoading && !!storage,
    queryFn: async () => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      return storage.getApplications();
    },
    staleTime: 30_000,
  });

  const saveApplicationMutation = useMutation({
    mutationFn: async (application: NewApplicationInput) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      return storage.saveApplication(application);
    },
    onSuccess: (savedApplication) => {
      queryClient.setQueryData<JobApplication[] | undefined>(queryKey, (data) => {
        const existing = data ?? [];
        const withoutDuplicate = existing.filter(
          (item) => item.applicationId !== savedApplication.applicationId
        );
        return [...withoutDuplicate, savedApplication];
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status, notes }: UpdateApplicationInput) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      await storage.updateApplicationStatus(applicationId, status, notes);
      return { applicationId, status, notes };
    },
    onSuccess: ({ applicationId, status, notes }) => {
      queryClient.setQueryData<JobApplication[] | undefined>(queryKey, (data) => {
        if (!data) return data;
        return data.map((application) =>
          application.applicationId === applicationId
            ? { ...application, status, notes: notes ?? application.notes }
            : application
        );
      });
    },
  });

  const error = applicationsQuery.error
    ? applicationsQuery.error instanceof Error
      ? applicationsQuery.error.message
      : "Failed to load applications"
    : null;

  const refreshApplications = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const saveApplication = async (application: NewApplicationInput) => {
    const saved = await saveApplicationMutation.mutateAsync(application);
    return saved;
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: JobApplication["status"],
    notes?: string
  ) => {
    await updateStatusMutation.mutateAsync({ applicationId, status, notes });
  };

  return {
    applications: applicationsQuery.data ?? [],
    isLoading: authLoading || applicationsQuery.isLoading,
    error,
    refreshApplications,
    saveApplication,
    updateApplicationStatus,
  };
}
