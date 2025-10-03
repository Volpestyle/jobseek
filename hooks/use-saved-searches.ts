import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth, useStorage } from "@/contexts/auth-context";
import { SavedSearch } from "@/lib/storage/storage.service";

export function useSavedSearches() {
  const { storage, isLoading: storageLoading } = useStorage();
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo<(string | undefined)[]>(
    () => ["savedSearches", isAuthenticated ? userId ?? "authenticated" : "anonymous"],
    [isAuthenticated, userId]
  );

  const savedSearchesQuery = useQuery<SavedSearch[]>({
    queryKey,
    enabled: !storageLoading && !!storage,
    queryFn: async () => {
      if (!storage) return [];
      return storage.getSavedSearches();
    },
  });

  const saveSearchMutation = useMutation({
    mutationFn: async (
      search: Omit<SavedSearch, "userId" | "searchId" | "createdAt" | "updatedAt">
    ) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      return storage.saveSearch(search);
    },
    onSuccess: (newSearch) => {
      queryClient.setQueryData<SavedSearch[] | undefined>(queryKey, (prev) => [
        ...(prev ?? []),
        newSearch,
      ]);
    },
  });

  const updateSearchMutation = useMutation({
    mutationFn: async (search: Omit<SavedSearch, "userId">) => {
      if (!storage || !storage.updateSavedSearch) {
        throw new Error("Storage not initialized");
      }
      return storage.updateSavedSearch(search);
    },
    onSuccess: (updatedSearch) => {
      queryClient.setQueryData<SavedSearch[] | undefined>(queryKey, (prev) =>
        (prev ?? []).map((existing) =>
          existing.searchId === updatedSearch.searchId ? updatedSearch : existing
        )
      );
    },
  });

  const deleteSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      await storage.deleteSavedSearch(searchId);
      return searchId;
    },
    onSuccess: (searchId) => {
      queryClient.setQueryData<SavedSearch[] | undefined>(queryKey, (prev) =>
        (prev ?? []).filter((search) => search.searchId !== searchId)
      );
    },
  });

  const searches = savedSearchesQuery.data ?? [];

  return {
    searches,
    isLoading: storageLoading || savedSearchesQuery.isLoading,
    error: savedSearchesQuery.error
      ? savedSearchesQuery.error instanceof Error
        ? savedSearchesQuery.error.message
        : "Failed to load searches"
      : null,
    isInitialized: searches.length > 0,
    saveSearch: async (
      search: Omit<SavedSearch, "userId" | "searchId" | "createdAt" | "updatedAt">
    ) => {
      await saveSearchMutation.mutateAsync(search);
    },
    updateSearch: async (search: Omit<SavedSearch, "userId">) => {
      await updateSearchMutation.mutateAsync(search);
    },
    deleteSearch: async (searchId: string) => {
      await deleteSearchMutation.mutateAsync(searchId);
    },
    refreshSearches: () => queryClient.invalidateQueries({ queryKey }),
  };
}
