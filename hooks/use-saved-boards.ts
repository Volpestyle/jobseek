import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useStorage } from "@/contexts/auth-context";
import {
  DEFAULT_JOB_BOARDS,
  DEFAULT_SAVED_BOARD_IDS,
  JobBoardConfig,
} from "@/lib/constants/default-job-boards";

type SavedBoardsQueryData = {
  savedBoardIds: string[];
  initialized: boolean;
};

interface UseSavedBoardsReturn {
  allBoards: JobBoardConfig[];
  savedBoardIds: string[];
  isLoading: boolean;
  isInitialized: boolean;
  toggleBoardSaved: (boardId: string) => Promise<void>;
  getSavedBoards: () => JobBoardConfig[];
  isBoardSaved: (boardId: string) => boolean;
}

export function useSavedBoards(): UseSavedBoardsReturn {
  const { storage, isLoading: storageLoading } = useStorage();
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo<(string | undefined)[]>(
    () => ["savedBoards", isAuthenticated ? userId ?? "authenticated" : "anonymous"],
    [isAuthenticated, userId]
  );

  const savedBoardsQuery = useQuery<SavedBoardsQueryData>({
    queryKey,
    enabled: !storageLoading && !!storage,
    queryFn: async () => {
      if (!storage) {
        return {
          savedBoardIds: DEFAULT_SAVED_BOARD_IDS,
          initialized: false,
        };
      }

      try {
        const initialized = (await storage.isUserInitialized?.()) ?? false;

        if (!initialized) {
          if (storage.initializeUserJobBoards) {
            await storage.initializeUserJobBoards(DEFAULT_SAVED_BOARD_IDS);
          }
          return {
            savedBoardIds: DEFAULT_SAVED_BOARD_IDS,
            initialized: true,
          };
        }

        const boards = await storage.getUserSavedBoards();
        return {
          savedBoardIds: boards,
          initialized: true,
        };
      } catch (error) {
        console.error("Failed to load saved boards:", error);
        return {
          savedBoardIds: DEFAULT_SAVED_BOARD_IDS,
          initialized: false,
        };
      }
    },
  });

  const toggleBoardSavedMutation = useMutation({
    mutationFn: async (boardId: string) => {
      if (!storage) {
        throw new Error("Storage not initialized");
      }
      const current = savedBoardsQuery.data?.savedBoardIds ?? [];
      const isSaved = current.includes(boardId);
      const nextState = !isSaved;
      await storage.saveUserBoardPreference(boardId, nextState);
      return { boardId, saved: nextState };
    },
    onMutate: async (boardId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SavedBoardsQueryData | undefined>(
        queryKey
      );

      const currentIds = previous?.savedBoardIds ?? [];
      const isSaved = currentIds.includes(boardId);
      const updatedIds = isSaved
        ? currentIds.filter((id) => id !== boardId)
        : [...currentIds, boardId];

      queryClient.setQueryData<SavedBoardsQueryData | undefined>(queryKey, {
        savedBoardIds: updatedIds,
        initialized: previous?.initialized ?? true,
      });

      return { previous };
    },
    onError: (error, _variables, context) => {
      console.error("Failed to save board preference:", error);
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: ({ boardId, saved }) => {
      queryClient.setQueryData<SavedBoardsQueryData | undefined>(
        queryKey,
        (data) => {
          const currentIds = data?.savedBoardIds ?? [];
          const nextIds = saved
            ? Array.from(new Set([...currentIds, boardId]))
            : currentIds.filter((id) => id !== boardId);
          return {
            savedBoardIds: nextIds,
            initialized: data?.initialized ?? true,
          };
        }
      );
    },
  });

  const savedBoardIds = savedBoardsQuery.data?.savedBoardIds ?? DEFAULT_SAVED_BOARD_IDS;
  const isInitialized = savedBoardsQuery.data?.initialized ?? false;

  const getSavedBoards = (): JobBoardConfig[] =>
    DEFAULT_JOB_BOARDS.filter((board) => savedBoardIds.includes(board.id));

  const isBoardSaved = (boardId: string): boolean => savedBoardIds.includes(boardId);

  const toggleBoardSaved = async (boardId: string) => {
    if (!storage) return;
    await toggleBoardSavedMutation.mutateAsync(boardId);
  };

  return {
    allBoards: DEFAULT_JOB_BOARDS,
    savedBoardIds,
    isLoading: storageLoading || savedBoardsQuery.isLoading,
    isInitialized,
    toggleBoardSaved,
    getSavedBoards,
    isBoardSaved,
  };
}
