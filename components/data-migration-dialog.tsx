"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Database,
  FileText,
  Briefcase,
  Search,
  User,
  Layout,
} from "lucide-react";
import {
  migrationService,
  MigrationProgress,
  MigrationResult,
} from "@/lib/migration/migration.service";
import { useSession } from "next-auth/react";

interface DataMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MigrationOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  enabled: boolean;
}

export function DataMigrationDialog({
  open,
  onOpenChange,
}: DataMigrationDialogProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Migration options state
  const [migrationOptions, setMigrationOptions] = useState<MigrationOption[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // Load migration preview on mount
  useEffect(() => {
    if (open) {
      const preview = migrationService.getMigrationPreview();
      const options: MigrationOption[] = [
        {
          id: "savedJobs",
          label: "Saved Jobs",
          icon: <Briefcase className="h-4 w-4" />,
          count: preview.counts.savedJobs,
          enabled: true,
        },
        {
          id: "savedSearches",
          label: "Saved Searches",
          icon: <Search className="h-4 w-4" />,
          count: preview.counts.savedSearches,
          enabled: true,
        },
        {
          id: "applications",
          label: "Job Applications",
          icon: <FileText className="h-4 w-4" />,
          count: preview.counts.applications,
          enabled: true,
        },
        {
          id: "jobBoards",
          label: "Custom Job Boards",
          icon: <Layout className="h-4 w-4" />,
          count: preview.counts.jobBoards,
          enabled: true,
        },
        {
          id: "searchResults",
          label: "Recent Search Results",
          icon: <Database className="h-4 w-4" />,
          count: preview.counts.searchResults,
          enabled: true,
        },
        {
          id: "profile",
          label: "User Profile",
          icon: <User className="h-4 w-4" />,
          count: preview.counts.hasProfile ? 1 : 0,
          enabled: preview.counts.hasProfile,
        },
      ];
      
      setMigrationOptions(options.filter(opt => opt.count > 0));
    }
  }, [open]);

  const handleToggleOption = (optionId: string) => {
    setMigrationOptions(prev =>
      prev.map(opt =>
        opt.id === optionId ? { ...opt, enabled: !opt.enabled } : opt
      )
    );
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setMigrationOptions(prev =>
      prev.map(opt => ({ ...opt, enabled: newValue }))
    );
  };

  const handleMigrate = async () => {
    if (!session?.user?.id) {
      setError("You must be logged in to migrate data");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(null);

    try {
      const result = await migrationService.migrate(
        session.user.id,
        (progress) => {
          setProgress(progress);
        }
      );

      setMigrationResult(result);
      
      if (result.success) {
        setSuccess(true);
        // Close dialog after success
        setTimeout(() => {
          onOpenChange(false);
          // Reload page to refresh data
          window.location.reload();
        }, 3000);
      } else {
        setError(
          result.errors.length > 0
            ? `Migration completed with errors: ${result.errors.join(", ")}`
            : "Migration failed"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to migrate data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    migrationService.setMigrationStatus("skipped");
    onOpenChange(false);
  };

  const getTotalItemsCount = () => {
    return migrationOptions.reduce(
      (sum, opt) => sum + (opt.enabled ? opt.count : 0),
      0
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome Back!</DialogTitle>
          <DialogDescription>
            We found data from your anonymous session. Select what you'd like to
            import to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && migrationResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully migrated:
                <ul className="mt-2 text-xs space-y-1">
                  {migrationResult.migratedCounts.savedJobs > 0 && (
                    <li>• {migrationResult.migratedCounts.savedJobs} saved jobs</li>
                  )}
                  {migrationResult.migratedCounts.savedSearches > 0 && (
                    <li>• {migrationResult.migratedCounts.savedSearches} saved searches</li>
                  )}
                  {migrationResult.migratedCounts.applications > 0 && (
                    <li>• {migrationResult.migratedCounts.applications} applications</li>
                  )}
                  {migrationResult.migratedCounts.jobBoards > 0 && (
                    <li>• {migrationResult.migratedCounts.jobBoards} job boards</li>
                  )}
                  {migrationResult.migratedCounts.searchResults > 0 && (
                    <li>• {migrationResult.migratedCounts.searchResults} search results</li>
                  )}
                  {migrationResult.migratedCounts.profile && (
                    <li>• User profile</li>
                  )}
                </ul>
                <p className="mt-2">Redirecting...</p>
              </AlertDescription>
            </Alert>
          )}

          {!success && !isLoading && (
            <>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All
                  </Label>
                </div>

                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="space-y-3">
                    {migrationOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={option.id}
                            checked={option.enabled}
                            onCheckedChange={() => handleToggleOption(option.id)}
                          />
                          <Label
                            htmlFor={option.id}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            {option.icon}
                            <span className="text-sm">{option.label}</span>
                          </Label>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {option.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="text-sm text-muted-foreground">
                  <p>
                    {getTotalItemsCount()} items selected for migration
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                You can always access this data later if you choose to skip now.
              </p>
            </>
          )}

          {isLoading && progress && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Migrating {progress.currentType}...</span>
                  <span>{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} />
                <p className="text-xs text-muted-foreground">
                  {progress.processedItems} of {progress.totalItems} items processed
                </p>
              </div>
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
              <Button
                onClick={handleMigrate}
                disabled={isLoading || getTotalItemsCount() === 0}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Migrating..." : "Import My Data"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}