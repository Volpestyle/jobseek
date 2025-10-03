import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Briefcase,
  Heart,
  Clock,
  XCircle,
  Calendar,
  ExternalLink,
  MapPin,
  DollarSign,
  Building,
  CheckCircle2,
  MinusCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ErrorAlert } from "../ui/error-alert";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { useJobApplications } from "@/hooks/use-job-applications";
import type {
  JobApplication,
  JobApplicationEvent,
  SavedJob,
} from "@/lib/db/dynamodb.service";

type JobStatus = "saved" | JobApplication["status"];
type JobStatusFilter = "all" | JobStatus;

interface JobWithStatus {
  job: SavedJob;
  application?: JobApplication;
  status: JobStatus;
}

interface InterviewEventSummary {
  applicationId: string;
  jobTitle: string;
  company: string;
  date: string;
  description: string;
  metadata?: JobApplicationEvent["metadata"];
}

const statusLabel = (status: JobStatus) =>
  status === "saved"
    ? "Saved"
    : status
        .split("_")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");

const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case "applied":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "interviewing":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "offered":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "withdrawn":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "saved":
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: JobStatus) => {
  const commonClass = "h-4 w-4";

  switch (status) {
    case "applied":
      return <Clock className={commonClass} />;
    case "interviewing":
      return <Calendar className={commonClass} />;
    case "offered":
      return <CheckCircle2 className={commonClass} />;
    case "rejected":
      return <XCircle className={commonClass} />;
    case "withdrawn":
      return <MinusCircle className={commonClass} />;
    case "saved":
      return <Heart className={commonClass} />;
    default:
      return <Briefcase className={commonClass} />;
  }
};

const getTimestamp = (value?: string) => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatDate = (value?: string) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export function JobManagementPage() {
  const [filterStatus, setFilterStatus] =
    useState<JobStatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const {
    jobs: savedJobs,
    isLoading: savedJobsLoading,
    error: savedJobsError,
    deleteJob,
    refreshJobs,
  } = useSavedJobs();

  const {
    applications,
    isLoading: applicationsLoading,
    error: applicationsError,
    refreshApplications,
  } = useJobApplications();

  const applicationByJobId = useMemo(() => {
    const map = new Map<string, JobApplication>();

    for (const application of applications) {
      if (application.jobId) {
        map.set(application.jobId, application);
      }

      if (application.savedJobId) {
        map.set(application.savedJobId, application);
      }
    }

    return map;
  }, [applications]);

  const jobsWithStatus = useMemo<JobWithStatus[]>(() => {
    return savedJobs.map((job) => {
      const application = applicationByJobId.get(job.jobId);
      const status: JobStatus = application?.status ?? "saved";

      return {
        job,
        application,
        status,
      };
    });
  }, [savedJobs, applicationByJobId]);

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return jobsWithStatus.filter((item) => {
      const matchesStatus =
        filterStatus === "all" || item.status === filterStatus;

      if (!matchesStatus) return false;

      if (!term) return true;

      const haystack = [
        item.job.title,
        item.job.company,
        item.job.location,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      return haystack.some((value) => value.includes(term));
    });
  }, [jobsWithStatus, filterStatus, searchTerm]);

  const sortedJobs = useMemo(
    () =>
      [...filteredJobs].sort(
        (a, b) => getTimestamp(b.job.savedAt) - getTimestamp(a.job.savedAt)
      ),
    [filteredJobs]
  );

  const upcomingInterviews = useMemo<InterviewEventSummary[]>(() => {
    const now = Date.now();

    return applications
      .flatMap((application) => {
        if (!application.events) return [];

        return application.events
          .filter((event) => event.type === "interview")
          .map((event) => ({
            applicationId: application.applicationId,
            jobTitle: application.jobTitle,
            company: application.company,
            date: event.date,
            description: event.description,
            metadata: event.metadata,
          }));
      })
      .filter((event) => {
        const timestamp = getTimestamp(event.date);
        return timestamp >= now;
      })
      .sort((a, b) => getTimestamp(a.date) - getTimestamp(b.date));
  }, [applications]);

  const savedJobsEmpty = !savedJobsLoading && sortedJobs.length === 0;

  const handleDeleteJob = async (jobId: string) => {
    setDeletingJobId(jobId);
    try {
      await deleteJob(jobId);
    } catch (error) {
      console.error("Failed to delete saved job:", error);
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Job Management</h1>
        <p className="text-muted-foreground">
          Manage your saved jobs, track applications, and monitor interviews.
        </p>
      </div>

      <Tabs defaultValue="saved-jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved-jobs">Saved Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="saved-jobs" className="space-y-6">
          {savedJobsError && (
            <ErrorAlert
              message={savedJobsError}
              onRetry={() => void refreshJobs()}
            />
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Input
                  placeholder="Search saved jobs..."
                  className="max-w-sm"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select
                    value={filterStatus}
                    onValueChange={(value) =>
                      setFilterStatus(value as JobStatusFilter)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="interviewing">Interviewing</SelectItem>
                      <SelectItem value="offered">Offered</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {savedJobsLoading && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {!savedJobsLoading && savedJobsEmpty && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  You have not saved any jobs yet. Start a search and save
                  interesting roles to track them here.
                </CardContent>
              </Card>
            )}

            {!savedJobsLoading &&
              sortedJobs.map(({ job, application, status }) => {
                const savedOn = formatDate(job.savedAt);
                const appliedOn = application?.appliedAt
                  ? formatDate(application.appliedAt)
                  : null;
                const meetingNotes = application?.notes || job.notes;
                const nextInterview = application?.events
                  ?.filter((event) => event.type === "interview")
                  .sort(
                    (a, b) => getTimestamp(a.date) - getTimestamp(b.date)
                  )
                  .find((event) => getTimestamp(event.date) >= Date.now());

                return (
                  <Card key={job.jobId}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3>{job.title}</h3>
                            <Badge
                              className={`flex items-center gap-1 ${getStatusColor(status)}`}
                            >
                              {getStatusIcon(status)}
                              <span>{statusLabel(status)}</span>
                            </Badge>
                            {job.source && (
                              <Badge variant="outline">{job.source}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {job.company && (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {job.company}
                              </div>
                            )}
                            {job.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </div>
                            )}
                            {job.salary && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {job.salary}
                              </div>
                            )}
                          </div>
                          {job.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {job.description}
                            </p>
                          )}
                          {job.tags && job.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {job.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {meetingNotes && (
                            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                              {meetingNotes}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
                          <span>Saved {savedOn}</span>
                          {appliedOn && <span>Applied {appliedOn}</span>}
                          {nextInterview && (
                            <span>
                              Next interview {formatDateTime(nextInterview.date)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          {application && (
                            <span>Application ID: {application.applicationId}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Job
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeleteJob(job.jobId)}
                            disabled={deletingJobId === job.jobId}
                          >
                            {deletingJobId === job.jobId ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-3 w-3" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Track the status and notes for each submitted application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationsError && (
                <ErrorAlert
                  message={applicationsError}
                  onRetry={() => void refreshApplications()}
                />
              )}

              {applicationsLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading applications...
                </div>
              )}

              {!applicationsLoading && applications.length === 0 && (
                <div className="text-muted-foreground">
                  No applications yet. Apply to a saved job to see it here.
                </div>
              )}

              {!applicationsLoading &&
                applications.map((application) => {
                  const relatedJob = savedJobs.find(
                    (job) =>
                      job.jobId === application.jobId ||
                      job.jobId === application.savedJobId
                  );
                  const latestInterview = application.events
                    ?.filter((event) => event.type === "interview")
                    .sort(
                      (a, b) => getTimestamp(b.date) - getTimestamp(a.date)
                    )?.[0];

                  return (
                    <Card key={application.applicationId}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4>{application.jobTitle}</h4>
                              <Badge
                                className={`flex items-center gap-1 ${getStatusColor(application.status)}`}
                              >
                                {getStatusIcon(application.status)}
                                <span>{statusLabel(application.status)}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {application.company}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Applied {formatDate(application.appliedAt)}
                            </p>
                            {application.notes && (
                              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                                {application.notes}
                              </div>
                            )}
                            {latestInterview && (
                              <div className="rounded-md border border-dashed p-3 text-sm">
                                <p className="font-medium">Latest interview</p>
                                <p className="text-muted-foreground">
                                  {formatDateTime(latestInterview.date)}
                                </p>
                                {latestInterview.description && (
                                  <p className="text-muted-foreground">
                                    {latestInterview.description}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
                            <span>ID: {application.applicationId}</span>
                            {relatedJob?.url && (
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={relatedJob.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Posting
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>
                Interviews automatically surface when you log events on an
                application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationsError && (
                <ErrorAlert
                  message={applicationsError}
                  onRetry={() => void refreshApplications()}
                />
              )}

              {applicationsLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading interview schedule...
                </div>
              )}

              {!applicationsLoading && upcomingInterviews.length === 0 && (
                <div className="text-muted-foreground">
                  No upcoming interviews logged yet. Add interview events to an
                  application to surface them here.
                </div>
              )}

              {!applicationsLoading &&
                upcomingInterviews.map((interview) => {
                  const meetingLink =
                    typeof interview.metadata?.meetingLink === "string"
                      ? (interview.metadata?.meetingLink as string)
                      : undefined;

                  return (
                    <Card key={`${interview.applicationId}-${interview.date}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1 space-y-1">
                            <h4>{interview.jobTitle}</h4>
                            <p className="text-sm text-muted-foreground">
                              {interview.company}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(interview.date)}
                            </div>
                            {interview.description && (
                              <p className="text-sm text-muted-foreground">
                                {interview.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge variant="outline">
                              Application {interview.applicationId}
                            </Badge>
                            {meetingLink && (
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Join Meeting
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
