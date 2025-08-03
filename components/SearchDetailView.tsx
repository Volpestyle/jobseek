'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Square, 
  Send, 
  Bookmark, 
  ExternalLink,
  MapPin,
  DollarSign,
  Clock,
  Building,
  Eye,
  Heart,
  MessageSquare
} from 'lucide-react';

interface SearchDetailViewProps {
  search: {
    id: number;
    name: string;
    status: string;
    progress: number;
    jobsFound: number;
    applicationsSubmitted: number;
    boards: string[];
    location: string;
    salary: string;
    duration: string;
    estimatedRemaining: string;
  };
  onBack: () => void;
}

export function SearchDetailView({ search, onBack }: SearchDetailViewProps) {
  const [message, setMessage] = useState('');
  
  const instructions = [
    "Searching LinkedIn for Senior Frontend Developer positions...",
    "Filtering by location: Remote",
    "Applying salary filter: $120k - $180k",
    "Scanning job descriptions for React and TypeScript",
    "Found 12 new matches, evaluating fit...",
    "Saving high-potential positions to review queue"
  ];

  const foundJobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      location: 'Remote',
      salary: '$140k - $180k',
      posted: '2 hours ago',
      matchScore: 95,
      applied: false,
      saved: true,
      description: 'We are looking for a Senior Frontend Developer with 5+ years of experience in React, TypeScript, and modern web technologies...',
      requirements: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],
      benefits: ['Remote work', 'Health insurance', 'Stock options', '401k matching']
    },
    {
      id: 2,
      title: 'React Developer - Remote',
      company: 'StartupXYZ',
      location: 'Worldwide Remote',
      salary: '$120k - $160k',
      posted: '4 hours ago',
      matchScore: 88,
      applied: true,
      saved: true,
      description: 'Join our fast-growing startup as a React Developer. You will work on cutting-edge products used by millions...',
      requirements: ['React', 'JavaScript', 'CSS', 'Git', 'Jest'],
      benefits: ['Flexible hours', 'Unlimited PTO', 'Learning budget', 'Remote setup allowance']
    },
    {
      id: 3,
      title: 'Frontend Engineer',
      company: 'BigTech Solutions',
      location: 'Remote (US only)',
      salary: '$150k - $200k',
      posted: '1 day ago',
      matchScore: 82,
      applied: false,
      saved: false,
      description: 'We are seeking a talented Frontend Engineer to join our platform team. You will be responsible for building...',
      requirements: ['React', 'Vue.js', 'TypeScript', 'Docker', 'Kubernetes'],
      benefits: ['Competitive salary', 'Equity', 'Health benefits', 'Professional development']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">{search.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Duration: {search.duration}</span>
            <span>•</span>
            <span>ETA: {search.estimatedRemaining}</span>
            <span>•</span>
            <Badge variant={search.status === 'running' ? 'default' : 'secondary'}>
              {search.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {search.status === 'running' ? (
            <Button variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          <Button variant="outline">
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Search Progress</span>
            <span className="text-sm">{search.progress}%</span>
          </div>
          <Progress value={search.progress} className="h-2" />
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Jobs Found</p>
              <p className="text-xl">{search.jobsFound}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Applied</p>
              <p className="text-xl">{search.applicationsSubmitted}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Match Rate</p>
              <p className="text-xl">73%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Browser Viewport */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Browser Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-muted/20 h-96 p-4">
                <div className="flex items-center gap-2 mb-4 p-2 bg-background rounded border">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 text-sm text-muted-foreground px-3 py-1 bg-muted rounded">
                    https://www.linkedin.com/jobs/search/?keywords=Senior%20Frontend%20Developer
                  </div>
                </div>
                <div className="space-y-2 h-80 overflow-hidden">
                  <div className="bg-white dark:bg-card p-4 rounded border">
                    <div className="h-4 bg-blue-600 rounded mb-2"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-card p-4 rounded border">
                    <div className="h-4 bg-green-600 rounded mb-2"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-card p-4 rounded border">
                    <div className="h-4 bg-purple-600 rounded mb-2"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Instructions/Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {instructions.map((instruction, index) => (
                    <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                      {instruction}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Input 
                  placeholder="Type an instruction..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Found */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs Found ({foundJobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {foundJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {job.matchScore}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {job.salary}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Posted {job.posted}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {job.requirements.slice(0, 3).map((req) => (
                        <Badge key={req} variant="secondary" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                      {job.requirements.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{job.requirements.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={job.applied ? 'secondary' : 'default'}
                        disabled={job.applied}
                        className="flex-1"
                      >
                        {job.applied ? 'Applied' : 'Apply'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant={job.saved ? 'default' : 'outline'}
                      >
                        <Heart className={`h-3 w-3 ${job.saved ? 'fill-current' : ''}`} />
                      </Button>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}