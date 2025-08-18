"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { storageService } from "@/lib/storage/storage.service";
import { toast } from "sonner";

export function MigrationHandler() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    const checkAndMigrate = async () => {
      if (!session?.user?.id) return;

      // Check if migration has already been done
      const migrationComplete = localStorage.getItem(
        "jobseek_migration_complete"
      );
      if (migrationComplete) return;

      // Check if there's any local data to migrate
      const hasLocalData =
        localStorage.getItem("jobseek_profile") ||
        localStorage.getItem("jobseek_saved_jobs") ||
        localStorage.getItem("jobseek_saved_searches") ||
        localStorage.getItem("jobseek_applications") ||
        localStorage.getItem("jobseek_job_boards");

      if (!hasLocalData) {
        // No data to migrate, mark as complete
        localStorage.setItem("jobseek_migration_complete", "true");
        return;
      }

      try {
        toast.info("Migrating your saved data...");
        await storageService.migrateAnonymousData(session.user.id);
        toast.success("Your data has been successfully migrated!");
      } catch (error) {
        console.error("Migration failed:", error);
        toast.error(
          "Failed to migrate your data. Please try refreshing the page."
        );
      }
    };

    checkAndMigrate();
  }, [session?.user?.id, status]);

  return null;
}
