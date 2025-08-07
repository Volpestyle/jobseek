"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, MapPin, DollarSign, Building2 } from "lucide-react";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { AnimatedSaveButton } from "@/components/ui/animated-save-button";
import { toast } from "sonner";

interface Job {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
  source: string;
  postedDate?: string;
}

interface JobsTableProps {
  jobs: Job[];
  totalJobs: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function JobsTable({
  jobs,
  totalJobs,
  currentPage,
  pageSize,
  onPageChange,
  isLoading,
}: JobsTableProps) {
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const { saveJob, jobs: savedJobs } = useSavedJobs();

  const totalPages = Math.ceil(totalJobs / pageSize);

  const handleSelectJob = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map((job) => job.jobId)));
    }
  };

  const handleSaveJob = async (job: Job) => {
    try {
      await saveJob({
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        url: job.url,
        description: job.description,
        source: job.source,
      });
      toast.success("Job saved successfully");
    } catch (error) {
      toast.error("Failed to save job");
    }
  };

  const isJobSaved = (jobId: string) => {
    return savedJobs.some((saved) => saved.jobId === jobId);
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No jobs extracted yet. The search is in progress...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, totalJobs)} of {totalJobs} jobs
        </div>
        {selectedJobs.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedJobs.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                selectedJobs.forEach((jobId) => {
                  const job = jobs.find((j) => j.jobId === jobId);
                  if (job) handleSaveJob(job);
                });
                setSelectedJobs(new Set());
              }}
            >
              Save Selected
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedJobs.size === jobs.length && jobs.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.jobId}>
                <TableCell>
                  <Checkbox
                    checked={selectedJobs.has(job.jobId)}
                    onCheckedChange={() => handleSelectJob(job.jobId)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{job.title}</div>
                    {job.postedDate && (
                      <div className="text-xs text-muted-foreground">
                        Posted {job.postedDate}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span>{job.company}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{job.location}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {job.salary ? (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{job.salary}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Not specified
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <AnimatedSaveButton
                      isSaved={isJobSaved(job.jobId)}
                      onClick={() => handleSaveJob(job)}
                      disabled={false}
                      size="sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(job.url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {totalPages > 5 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
