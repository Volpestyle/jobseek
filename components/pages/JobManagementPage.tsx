"use client";

import React, { useState } from "react";
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
  CheckCircle,
  XCircle,
  Calendar,
  ExternalLink,
  Filter,
  Search,
  MapPin,
  DollarSign,
  Building,
} from "lucide-react";

export function JobManagementPage() {
  const [filterStatus, setFilterStatus] = useState("all");

  const savedJobs = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "TechCorp Inc.",
      location: "Remote",
      salary: "$140k - $180k",
      status: "applied",
      appliedDate: "2025-07-28",
      source: "LinkedIn",
      matchScore: 95,
      description:
        "We are looking for a Senior Frontend Developer with 5+ years of experience...",
      nextStep: "Waiting for recruiter response",
      deadline: "2025-08-05",
    },
    {
      id: 2,
      title: "React Developer",
      company: "StartupXYZ",
      location: "San Francisco, CA",
      salary: "$120k - $160k",
      status: "interview_scheduled",
      appliedDate: "2025-07-25",
      source: "AngelList",
      matchScore: 88,
      description: "Join our fast-growing startup as a React Developer...",
      nextStep: "Technical interview on Aug 5, 2025 at 2:00 PM",
      deadline: null,
    },
    {
      id: 3,
      title: "Frontend Engineer",
      company: "BigTech Solutions",
      location: "Remote",
      salary: "$150k - $200k",
      status: "saved",
      appliedDate: null,
      source: "Indeed",
      matchScore: 82,
      description:
        "We are seeking a talented Frontend Engineer to join our platform team...",
      nextStep: "Ready to apply",
      deadline: "2025-08-10",
    },
    {
      id: 4,
      title: "UI Developer",
      company: "DesignCo",
      location: "New York, NY",
      salary: "$110k - $150k",
      status: "rejected",
      appliedDate: "2025-07-20",
      source: "Glassdoor",
      matchScore: 75,
      description: "Looking for a UI Developer with strong design skills...",
      nextStep: "Application was not selected",
      deadline: null,
    },
  ];

  const upcomingInterviews = [
    {
      id: 1,
      company: "StartupXYZ",
      position: "React Developer",
      date: "2025-08-05",
      time: "2:00 PM",
      type: "Technical Interview",
      interviewer: "Sarah Johnson",
      meetingLink: "https://zoom.us/j/123456789",
    },
    {
      id: 2,
      company: "TechCorp Inc.",
      position: "Senior Frontend Developer",
      date: "2025-08-07",
      time: "10:30 AM",
      type: "Culture Fit",
      interviewer: "Mike Chen",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "interview_scheduled":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "saved":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "applied":
        return <Clock className="h-4 w-4" />;
      case "interview_scheduled":
        return <Calendar className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "saved":
        return <Heart className="h-4 w-4" />;
      default:
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const filteredJobs =
    filterStatus === "all"
      ? savedJobs
      : savedJobs.filter((job) => job.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Job Management</h1>
        <p className="text-muted-foreground">
          Manage your saved jobs, track applications, and schedule interviews.
        </p>
      </div>

      <Tabs defaultValue="saved-jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved-jobs">Saved Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="saved-jobs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input placeholder="Search jobs..." className="max-w-sm" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="saved">Saved</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="interview_scheduled">
                      Interview Scheduled
                    </SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3>{job.title}</h3>
                        <Badge className={getStatusColor(job.status)}>
                          {getStatusIcon(job.status)}
                          <span className="ml-1 capitalize">
                            {job.status.replace("_", " ")}
                          </span>
                        </Badge>
                        <Badge variant="outline">{job.matchScore}% match</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {job.company}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {job.salary}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {job.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Source: {job.source}
                        </span>
                        {job.appliedDate && (
                          <span className="text-muted-foreground">
                            Applied: {job.appliedDate}
                          </span>
                        )}
                        {job.deadline && (
                          <span className="text-orange-600">
                            Deadline: {job.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next step: </span>
                      <span>{job.nextStep}</span>
                    </div>
                    <div className="flex gap-2">
                      {job.status === "saved" && (
                        <Button size="sm">Apply Now</Button>
                      )}
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Track the status of your job applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedJobs
                  .filter(
                    (job) =>
                      job.status === "applied" ||
                      job.status === "interview_scheduled" ||
                      job.status === "rejected"
                  )
                  .map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4>{job.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.company}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Applied: {job.appliedDate}
                        </p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1 capitalize">
                          {job.status.replace("_", " ")}
                        </span>
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>
                Your scheduled interviews and meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingInterviews.map((interview) => (
                  <Card key={interview.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4>{interview.position}</h4>
                          <p className="text-sm text-muted-foreground">
                            {interview.company}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {interview.date} at {interview.time}
                            </div>
                            <Badge variant="outline">{interview.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Interviewer: {interview.interviewer}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Join
                          </Button>
                          <Button size="sm" variant="outline">
                            Reschedule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
