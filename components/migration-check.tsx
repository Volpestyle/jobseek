import { useEffect, useState } from "react";
import { DataMigrationDialog } from "./data-migration-dialog";
import { migrationService } from "@/lib/migration/migration.service";
import { useAuth } from "@/contexts/auth-context";

export function MigrationCheck() {
  const { user, isLoading } = useAuth();
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Only check for migration if user is authenticated
    if (user?.id) {
      const migrationStatus = migrationService.getMigrationStatus();
      const hasData = migrationService.hasAnonymousData();

      // Show dialog if:
      // 1. There's anonymous data to migrate
      // 2. Migration hasn't been completed or skipped
      // 3. Not currently in progress
      if (
        hasData &&
        migrationStatus !== "completed" &&
        migrationStatus !== "skipped" &&
        migrationStatus !== "in_progress"
      ) {
        setShowMigrationDialog(true);
      }
    }
  }, [user, isLoading]);

  return (
    <DataMigrationDialog
      open={showMigrationDialog}
      onOpenChange={setShowMigrationDialog}
    />
  );
}
