"use client";

import { useState, useEffect, useCallback } from "react";
import { useStorage } from "@/contexts/auth-context";
import { JobSearchResult } from "@/lib/storage/storage.service";

export function useJobSearchResults() {
  const { storage, isLoading: storageLoading } = useStorage();
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all job search results
  const loadResults = useCallback(async () => {
    if (!storage || storageLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await storage.getAllJobSearchResults();
      setResults(searchResults);
    } catch (err) {
      console.error("Failed to load job search results:", err);
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  }, [storage, storageLoading]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Get results for a specific session
  const getSessionResults = useCallback(
    async (searchId: string) => {
      if (!storage) return null;

      try {
        // Since getJobSearchResults was removed, we need to filter from all results
        const allResults = await storage.getAllJobSearchResults();
        return allResults.find(r => r.searchId === searchId) || null;
      } catch (err) {
        console.error("Failed to get session results:", err);
        return null;
      }
    },
    [storage]
  );

  // Save new job search results
  const saveResults = useCallback(
    async (searchResult: Omit<JobSearchResult, "userId">) => {
      if (!storage) return;

      try {
        const saved = await storage.saveJobSearchResults(searchResult);
        // Update local state
        setResults((prev) => [
          ...prev.filter((r) => r.searchId !== saved.searchId),
          saved,
        ]);
        return saved;
      } catch (err) {
        console.error("Failed to save search results:", err);
        throw err;
      }
    },
    [storage]
  );

  // Update existing results (e.g., when more jobs are found)
  const updateResults = useCallback(
    async (
      searchId: string,
      updates: Partial<Omit<JobSearchResult, "userId">>
    ) => {
      if (!storage) return;

      try {
        const updated = await storage.updateJobSearchResults(
          searchId,
          updates
        );
        // Update local state
        setResults((prev) =>
          prev.map((r) => (r.searchId === searchId ? updated : r))
        );
        return updated;
      } catch (err) {
        console.error("Failed to update search results:", err);
        throw err;
      }
    },
    [storage]
  );

  return {
    results,
    isLoading: isLoading || storageLoading,
    error,
    getSessionResults,
    saveResults,
    updateResults,
    refreshResults: loadResults,
  };
}
