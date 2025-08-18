"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface DataMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataMigrationDialog({
  open,
  onOpenChange,
}: DataMigrationDialogProps) {
  const { migrateAnonymousData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleMigrate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await migrateAnonymousData();
      setSuccess(true);

      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
        // Reload page to refresh data
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to migrate data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Mark that user chose to skip migration
    localStorage.setItem("jobseek_migration_skipped", "true");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome Back!</DialogTitle>
          <DialogDescription>
            We found data from your anonymous session. Would you like to import
            it to your account?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Data migrated successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {!success && !error && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This will import:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All saved jobs</li>
                <li>Your search configurations</li>
                <li>Application history</li>
                <li>Custom job boards</li>
                <li>Job search results from recent sessions</li>
              </ul>
              <p className="text-xs mt-3">
                You can always access this data later if you choose to skip now.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!success && (
            <>
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isLoading}
              >
                Skip & Start Fresh
              </Button>
              <Button onClick={handleMigrate} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import My Data
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
