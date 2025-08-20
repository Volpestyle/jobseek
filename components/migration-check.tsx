"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DataMigrationDialog } from "./data-migration-dialog";
import { migrationService } from "@/lib/migration/migration.service";

export function MigrationCheck() {
  const { data: session, status } = useSession();
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    // Only check for migration if user is authenticated
    if (session?.user?.id) {
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
  }, [session, status]);

  return (
    <DataMigrationDialog
      open={showMigrationDialog}
      onOpenChange={setShowMigrationDialog}
    />
  );
}