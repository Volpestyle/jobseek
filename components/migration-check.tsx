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
      
      if (hasAnonymousData && !hasMigrated) {
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