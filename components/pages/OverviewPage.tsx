"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import {
  Search,
  Briefcase,
  PlayCircle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

export function OverviewPage() {
  const { loading, error, displayName } = useProfile();
  const router = useRouter();

  const stats = [
    {
      label: "Active Searches",
      value: "3",
      icon: PlayCircle,
      color: "text-blue-600",
    },
    {
      label: "Jobs Found",
      value: "147",
      icon: Search,
      color: "text-green-600",
    },
    {
      label: "Applications Sent",
      value: "23",
      icon: Briefcase,
      color: "text-purple-600",
    },
    {
      label: "Interviews Scheduled",
      value: "5",
      icon: Calendar,
      color: "text-orange-600",
    },
  ];

  const recentSearches = [
    {
      name: "Senior Frontend Developer",
      boards: ["LinkedIn", "Indeed"],
      jobsFound: 42,
      status: "running",
      progress: 75,
    },
    {
      name: "React Engineer Remote",
      boards: ["AngelList", "RemoteOK"],
      jobsFound: 28,
      status: "running",
      progress: 50,
    },
    {
      name: "Full Stack Developer",
      boards: ["Stack Overflow", "Dice"],
      jobsFound: 77,
      status: "completed",
      progress: 100,
    },
  ];

  const upcomingInterviews = [
    {
      company: "TechCorp Inc.",
      position: "Senior React Developer",
      date: "Aug 5, 2025",
      time: "2:00 PM",
      type: "Technical Interview",
    },
    {
      company: "StartupXYZ",
      position: "Frontend Engineer",
      date: "Aug 7, 2025",
      time: "10:30 AM",
      type: "Culture Fit",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">
          Welcome back,{" "}
          {loading ? (
            <Skeleton className="h-8 w-32 inline-block" />
          ) : error ? (
            <span className="text-muted-foreground">there</span>
          ) : (
            <span>{displayName}</span>
          )}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your job searches today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Active Searches
            </CardTitle>
            <CardDescription>Your current job search sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentSearches.map((search, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{search.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {search.boards.join(", ")} • {search.jobsFound} jobs found
                    </p>
                  </div>
                  <Badge
                    variant={
                      search.status === "running" ? "default" : "secondary"
                    }
                  >
                    {search.status}
                  </Badge>
                </div>
                <Progress value={search.progress} className="h-2" />
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Searches
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Interviews
            </CardTitle>
            <CardDescription>
              Your scheduled interviews this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingInterviews.map((interview, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{interview.company}</p>
                  <p className="text-sm text-muted-foreground">
                    {interview.position}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {interview.date} at {interview.time}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {interview.type}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              variant="outline" 
              align="start"
              className="h-auto p-4"
              onClick={() => router.push('/dashboard/job-search')}
            >
              <div className="flex flex-col items-start space-y-2">
                <Search className="h-5 w-5" />
                <span>Start New Search</span>
                <span className="text-xs text-muted-foreground">
                  Create a new job search session
                </span>
              </div>
            </Button>
            <Button variant="outline" align="start" className="h-auto p-4">
              <div className="flex flex-col items-start space-y-2">
                <Briefcase className="h-5 w-5" />
                <span>Review Applications</span>
                <span className="text-xs text-muted-foreground">
                  Check status of sent applications
                </span>
              </div>
            </Button>
            <Button variant="outline" align="start" className="h-auto p-4">
              <div className="flex flex-col items-start space-y-2">
                <TrendingUp className="h-5 w-5" />
                <span>View Analytics</span>
                <span className="text-xs text-muted-foreground">
                  See detailed search metrics
                </span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
