'use client'

import { useState, useEffect } from 'react'
import { useStorage } from '@/contexts/auth-context'
import { DEFAULT_JOB_BOARDS, DEFAULT_SAVED_BOARD_IDS, JobBoardConfig } from '@/lib/constants/default-job-boards'

interface UseSavedBoardsReturn {
  allBoards: JobBoardConfig[]
  savedBoardIds: string[]
  isLoading: boolean
  isInitialized: boolean
  toggleBoardSaved: (boardId: string) => Promise<void>
  getSavedBoards: () => JobBoardConfig[]
  isBoardSaved: (boardId: string) => boolean
}

export function useSavedBoards(): UseSavedBoardsReturn {
  const { storage, isLoading: storageLoading } = useStorage()
  const [savedBoardIds, setSavedBoardIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (storageLoading || !storage) return

    const initializeBoards = async () => {
      try {
        setIsLoading(true)
        
        // Check if user has been initialized
        const initialized = await storage.isUserInitialized()
        setIsInitialized(initialized)
        
        if (!initialized) {
          // Initialize with default boards
          await storage.initializeUserJobBoards(DEFAULT_SAVED_BOARD_IDS)
          setSavedBoardIds(DEFAULT_SAVED_BOARD_IDS)
          setIsInitialized(true)
        } else {
          // Load user's saved boards
          const boards = await storage.getUserSavedBoards()
          setSavedBoardIds(boards)
        }
      } catch (error) {
        console.error('Failed to initialize boards:', error)
        // Fallback to defaults on error
        setSavedBoardIds(DEFAULT_SAVED_BOARD_IDS)
      } finally {
        setIsLoading(false)
      }
    }

    initializeBoards()
  }, [storage, storageLoading])

  const toggleBoardSaved = async (boardId: string) => {
    if (!storage) return

    const isSaved = savedBoardIds.includes(boardId)
    const newSaved = !isSaved

    try {
      // Optimistically update UI
      if (newSaved) {
        setSavedBoardIds(prev => [...prev, boardId])
      } else {
        setSavedBoardIds(prev => prev.filter(id => id !== boardId))
      }

      // Persist to storage
      await storage.saveUserBoardPreference(boardId, newSaved)
    } catch (error) {
      console.error('Failed to save board preference:', error)
      // Revert on error
      if (newSaved) {
        setSavedBoardIds(prev => prev.filter(id => id !== boardId))
      } else {
        setSavedBoardIds(prev => [...prev, boardId])
      }
      throw error
    }
  }

  const getSavedBoards = (): JobBoardConfig[] => {
    return DEFAULT_JOB_BOARDS.filter(board => savedBoardIds.includes(board.id))
  }

  const isBoardSaved = (boardId: string): boolean => {
    return savedBoardIds.includes(boardId)
  }

  return {
    allBoards: DEFAULT_JOB_BOARDS,
    savedBoardIds,
    isLoading: isLoading || storageLoading,
    isInitialized,
    toggleBoardSaved,
    getSavedBoards,
    isBoardSaved,
  }
}