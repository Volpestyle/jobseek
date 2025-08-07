'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { DataMigrationDialog } from './data-migration-dialog'

export function MigrationCheck() {
  const { isAuthenticated, isLoading } = useAuth()
  const [showMigrationDialog, setShowMigrationDialog] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check if there's anonymous data to migrate
      const hasAnonymousData = localStorage.getItem('jobseek_anonymous_user_id') !== null
      const hasMigrated = localStorage.getItem('jobseek_migration_complete') === 'true'
      const hasSkipped = localStorage.getItem('jobseek_migration_skipped') === 'true'
      
      // Only show dialog if:
      // 1. There's anonymous data
      // 2. User hasn't already migrated
      // 3. User hasn't explicitly skipped migration
      if (hasAnonymousData && !hasMigrated && !hasSkipped) {
        setShowMigrationDialog(true)
      }
    }
  }, [isAuthenticated, isLoading])

  return (
    <DataMigrationDialog 
      open={showMigrationDialog} 
      onOpenChange={setShowMigrationDialog}
    />
  )
}