"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { SessionDetailsView } from "@/components/session/SessionDetailsView";
import { useSessionDetails } from "@/hooks/use-session-details";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const {
    session,
    jobs,
    actionLogs,
    isLoading,
    error,
    refreshSession,
    totalJobs,
    currentPage,
    setCurrentPage,
    pageSize,
  } = useSessionDetails(sessionId);

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      RUNNING: "default",
      COMPLETED: "secondary",
      ERROR: "destructive",
      TIMED_OUT: "outline",
    };

    const colors: Record<string, string> = {
      RUNNING: "bg-blue-500",
      COMPLETED: "bg-green-500",
      ERROR: "bg-red-500",
      TIMED_OUT: "bg-gray-500",
    };

    return (
      <Badge variant={variants[status] || "default"} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  if (isLoading && !session) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/active-searches")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Active Searches
          </Button>
          <h1 className="text-2xl font-bold">Session Details</h1>
          {session && getStatusBadge(session.status)}
        </div>
        <Button onClick={refreshSession} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {session && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Search Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Keywords:</span>{" "}
                {(session.userMetadata?.keywords as string) || "N/A"}
              </div>
              <div>
                <span className="font-medium">Location:</span>{" "}
                {(session.userMetadata?.location as string) || "N/A"}
              </div>
              <div>
                <span className="font-medium">Job Board:</span>{" "}
                {(session.userMetadata?.jobBoard as string) || "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Session ID:</span>{" "}
                <code className="text-xs">{sessionId.slice(0, 8)}...</code>
              </div>
              <div>
                <span className="font-medium">Started:</span>{" "}
                {new Date(session.startedAt).toLocaleTimeString()}
              </div>
              <div>
                <span className="font-medium">Region:</span> {session.region}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Jobs Found:</span>{" "}
                <span className="text-xl font-bold">{totalJobs}</span>
              </div>
              <div>
                <span className="font-medium">Last Updated:</span>{" "}
                {session.updatedAt
                  ? new Date(session.updatedAt).toLocaleTimeString()
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {session && (
        <SessionDetailsView
          sessionId={sessionId}
          session={session}
          jobs={jobs}
          actionLogs={actionLogs}
          totalJobs={totalJobs}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
