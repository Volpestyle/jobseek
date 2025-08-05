'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import { createClientStorageService } from '@/lib/storage/client-storage.service'
import { ClientStorageService } from '@/lib/storage/storage.interface'
import { storageService } from '@/lib/storage/storage.service'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  userId: string | null
  storage: ClientStorageService | null
  promptSignIn: () => void
  migrateAnonymousData: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [storage, setStorage] = useState<ClientStorageService | null>(null)
  const [storageInitialized, setStorageInitialized] = useState(false)

  const isSessionLoading = status === 'loading'
  const isAuthenticated = !!session?.user
  const userId = session?.user?.id || null
  
  // Combined loading state: session is loading OR storage not initialized
  const isLoading = isSessionLoading || !storageInitialized

  useEffect(() => {
    // Initialize storage based on auth state
    if (isSessionLoading) return

    const clientStorage = createClientStorageService(isAuthenticated, userId)
    setStorage(clientStorage)
    setStorageInitialized(true)
  }, [isSessionLoading, isAuthenticated, userId])

  const promptSignIn = () => {
    // This can be replaced with a modal or toast
    if (window.confirm('Sign in to sync your data across devices and never lose your saved jobs. Continue to sign in?')) {
      window.location.href = '/auth/signin'
    }
  }

  const migrateAnonymousData = async () => {
    if (!isAuthenticated || !session?.user?.id) {
      throw new Error('User must be authenticated to migrate data')
    }

    try {
      await storageService.migrateAnonymousData(session.user.id)
      // Refresh storage with new authenticated client
      const authStorage = createClientStorageService(true, session.user.id)
      setStorage(authStorage)
    } catch (error) {
      console.error('Failed to migrate anonymous data:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Sign out from NextAuth (this will clear the session cookie)
      await nextAuthSignOut({ redirect: false })
      // Redirect to home
      window.location.href = '/'
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        storage,
        promptSignIn,
        migrateAnonymousData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for components that need storage
export function useStorage() {
  const { storage, isLoading } = useAuth()
  
  if (isLoading) {
    return { storage: null, isLoading: true }
  }

  if (!storage) {
    throw new Error('Storage not initialized')
  }

  return { storage, isLoading: false }
}