"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionLogsPanel } from "./ActionLogsPanel";
import { JobsTable } from "./JobsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Monitor, List, Activity } from "lucide-react";

// Dynamically import BrowserViewport to avoid SSR issues
const BrowserViewport = dynamic(
  () =>
    import("@wallcrawler/components").then((mod) => ({
      default: mod.BrowserViewport,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    ),
  }
);

interface SessionDetailsViewProps {
  sessionId: string;
  session: any;
  jobs: any[];
  actionLogs: any[];
  totalJobs: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function SessionDetailsView({
  sessionId,
  session,
  jobs,
  actionLogs,
  totalJobs,
  currentPage,
  pageSize,
  onPageChange,
  isLoading,
}: SessionDetailsViewProps) {
  const [stagehandPage, setStagehandPage] = useState<any>(null);
  const [viewportError, setViewportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browser");

  // Initialize Stagehand page connection if session is running
  useEffect(() => {
    if (session?.status === "RUNNING" && session?.connectUrl) {
      // Here we would initialize the Stagehand page connection
      // This would typically come from the Wallcrawler SDK
      // For now, we'll just set a placeholder
      console.log("Would connect to session:", sessionId);
    }
  }, [session, sessionId]);

  const isSessionActive = session?.status === "RUNNING";

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar - Action Logs */}
      <div className="col-span-12 lg:col-span-3">
        <Card className="h-[800px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Stagehand Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ActionLogsPanel
              logs={actionLogs}
              isLoading={isLoading}
              sessionStatus={session?.status}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="col-span-12 lg:col-span-9 space-y-6">
        {/* Browser Viewport or Jobs Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browser" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Browser View
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Jobs ({totalJobs})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browser" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Live Browser Session
                  {!isSessionActive && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Session {session?.status?.toLowerCase() || "inactive"})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSessionActive && stagehandPage ? (
                  <BrowserViewport
                    sessionId={sessionId}
                    stagehandPage={stagehandPage}
                    width={1280}
                    height={720}
                    quality={80}
                    frameRate={10}
                    enableInteraction={false}
                    onError={(error) => setViewportError(error.message)}
                    className="rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-[600px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      {session?.status === "COMPLETED" ? (
                        <p>
                          Session completed. Browser view is no longer
                          available.
                        </p>
                      ) : session?.status === "ERROR" ? (
                        <p>Session encountered an error.</p>
                      ) : (
                        <p>Waiting for browser connection...</p>
                      )}
                    </div>
                  </div>
                )}

                {viewportError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{viewportError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Extracted Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <JobsTable
                  jobs={jobs}
                  totalJobs={totalJobs}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
