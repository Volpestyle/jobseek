import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth, useStorage } from "@/contexts/auth-context";
import { JobSearchResult } from "@/lib/storage/storage.service";

export function useJobSearchResults() {
  const { userId, isAuthenticated } = useAuth();
  const { storage, isLoading: storageLoading } = useStorage();
  const queryClient = useQueryClient();

  const queryKey = useMemo<(string | undefined)[]>(
    () => ["jobSearchResults", isAuthenticated ? userId ?? "authenticated" : "anonymous"],
    [isAuthenticated, userId]
  );

  const resultsQuery = useQuery<JobSearchResult[]>({
    queryKey,
    enabled: !!storage && !storageLoading,
    queryFn: async () => {
      if (!storage) {
        return [];
      }
      return storage.getAllJobSearchResults();
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: async (searchResult: Omit<JobSearchResult, "userId">) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      return storage.saveJobSearchResults(searchResult);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<JobSearchResult[] | undefined>(queryKey, (prev) => {
        const existing = prev ?? [];
        const withoutCurrent = existing.filter((r) => r.searchId !== saved.searchId);
        return [...withoutCurrent, saved];
      });
    },
  });

  const updateResultsMutation = useMutation({
    mutationFn: async (
      params: {
        searchId: string;
        updates: Partial<Omit<JobSearchResult, "userId">>;
      }
    ) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      const { searchId, updates } = params;
      return storage.updateJobSearchResults(searchId, updates);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<JobSearchResult[] | undefined>(queryKey, (prev) =>
        (prev ?? []).map((r) => (r.searchId === updated.searchId ? updated : r))
      );
    },
  });

  const results = resultsQuery.data ?? [];

  const getSessionResults = (searchId: string) =>
    results.find((result) => result.searchId === searchId) || null;

  const saveResults = async (searchResult: Omit<JobSearchResult, "userId">) => {
    return saveResultsMutation.mutateAsync(searchResult);
  };

  const updateResults = async (
    searchId: string,
    updates: Partial<Omit<JobSearchResult, "userId">>
  ) => {
    return updateResultsMutation.mutateAsync({ searchId, updates });
  };

  const refreshResults = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const error = resultsQuery.error
    ? resultsQuery.error instanceof Error
      ? resultsQuery.error.message
      : "Failed to load job search results"
    : null;

  const isLoading = storageLoading || resultsQuery.isLoading;

  return {
    results,
    isLoading,
    error,
    getSessionResults,
    saveResults,
    updateResults,
    refreshResults,
  };
}
