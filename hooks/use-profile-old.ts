import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { UserProfile } from '@/lib/db/dynamodb-single-table.service'

interface UseProfileReturn {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  refreshProfile: () => Promise<void>
  displayName: string
}

const LOCAL_STORAGE_KEY = 'jobseek_profile'

export function useProfile(): UseProfileReturn {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (status === 'loading') return
    
    try {
      setLoading(true)
      setError(null)
      
      if (!session?.user?.id) {
        // Load from local storage when not authenticated
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (localData) {
          const parsedData = JSON.parse(localData)
          setProfile(parsedData)
        }
        setLoading(false)
        return
      }

      // Fetch from API when authenticated
      const response = await fetch('/api/user/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const data = await response.json()
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, status])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      setError(null)
      
      if (!session?.user?.id) {
        // Save to local storage when not authenticated
        const localProfile: UserProfile = {
          userId: 'local',
          ...profile,
          ...updates,
          createdAt: profile?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localProfile))
        setProfile(localProfile)
        return
      }

      // Save to API when authenticated
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }
      
      const updatedProfile = await response.json()
      setProfile(updatedProfile)
    } catch (err) {
      console.error('Error updating profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      throw err
    }
  }, [session?.user?.id, profile])

  const refreshProfile = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  // Compute display name
  const displayName = profile?.firstName 
    ? `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`
    : session?.user?.name || 'Anonymous'

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
    displayName,
  }
}