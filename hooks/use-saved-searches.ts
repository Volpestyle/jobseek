"use client";

import { useState, useEffect, useCallback } from "react";
import { useStorage } from "@/contexts/auth-context";
import { SavedSearch } from "@/lib/storage/storage.service";
import { getDefaultSearchesForUser } from "@/lib/constants/default-saved-searches";
import { useSavedBoards } from "./use-saved-boards";

export function useSavedSearches() {
  const { storage, isLoading: storageLoading } = useStorage();
  const { savedBoardIds, isLoading: boardsLoading } = useSavedBoards();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and load searches
  const initializeAndLoadSearches = useCallback(async () => {
    if (storageLoading || boardsLoading || !storage) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if already initialized
      const initialized = await storage.hasInitializedSearches();
      setIsInitialized(initialized);

      if (!initialized) {
        // Get default searches - pass savedBoardIds or use defaults if empty
        const boardsToUse =
          savedBoardIds.length > 0
            ? savedBoardIds
            : ["linkedin", "indeed", "glassdoor"];
        const defaultSearches = getDefaultSearchesForUser(boardsToUse);

        if (defaultSearches.length > 0) {
          // Initialize with default searches
          const searchesToSave = defaultSearches.map((search, index) => ({
            ...search,
            searchId: `default_search_${index}_${search.name.toLowerCase().replace(/\s+/g, "_")}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          await storage.initializeDefaultSearches(searchesToSave);
          await storage.markSearchesInitialized();
          setIsInitialized(true);
        }
      }

      // Load all searches
      const savedSearches = await storage.getSavedSearches();
      setSearches(savedSearches);
    } catch (err) {
      console.error("Failed to initialize/load saved searches:", err);
      setError(err instanceof Error ? err.message : "Failed to load searches");
    } finally {
      setIsLoading(false);
    }
  }, [storage, storageLoading, boardsLoading, savedBoardIds]);

  useEffect(() => {
    initializeAndLoadSearches();
  }, [initializeAndLoadSearches]);

  // Save a search
  const saveSearch = useCallback(
    async (
      search: Omit<
        SavedSearch,
        "userId" | "searchId" | "createdAt" | "updatedAt"
      >
    ) => {
      if (!storage) return;

      try {
        const savedSearch = await storage.saveSearch(search);
        // Add to local state immediately for optimistic UI
        setSearches((prev) => [...prev, savedSearch]);
      } catch (err) {
        console.error("Failed to save search:", err);
        // Reload searches to ensure consistency
        await initializeAndLoadSearches();
        throw err;
      }
    },
    [storage, initializeAndLoadSearches]
  );

  // Delete a search
  const deleteSearch = useCallback(
    async (searchId: string) => {
      if (!storage) return;

      try {
        await storage.deleteSavedSearch(searchId);
        // Remove from local state immediately for optimistic UI
        setSearches((prev) =>
          prev.filter((search) => search.searchId !== searchId)
        );
      } catch (err) {
        console.error("Failed to delete search:", err);
        // Reload searches to ensure consistency
        await initializeAndLoadSearches();
        throw err;
      }
    },
    [storage, initializeAndLoadSearches]
  );

  // Update a search
  const updateSearch = useCallback(
    async (search: Omit<SavedSearch, "userId">) => {
      if (!storage) return;

      try {
        const updatedSearch = await storage.updateSavedSearch(search);
        // Update local state immediately for optimistic UI
        setSearches((prev) =>
          prev.map((s) => (s.searchId === search.searchId ? updatedSearch : s))
        );
      } catch (err) {
        console.error("Failed to update search:", err);
        // Reload searches to ensure consistency
        await initializeAndLoadSearches();
        throw err;
      }
    },
    [storage, initializeAndLoadSearches]
  );

  return {
    searches,
    isLoading: isLoading || storageLoading || boardsLoading,
    error,
    isInitialized,
    saveSearch,
    updateSearch,
    deleteSearch,
    refreshSearches: initializeAndLoadSearches,
  };
}
