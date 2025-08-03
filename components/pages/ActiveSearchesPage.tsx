'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  PlayCircle, 
  Pause, 
  Square, 
  Eye, 
  MoreHorizontal,
  Clock,
  MapPin,
  Briefcase,
  TrendingUp,
  Search
} from 'lucide-react';
import { SearchDetailView } from '../SearchDetailView';
import { useSession } from 'next-auth/react';
import { useAnonymousSession } from '@/hooks/use-anonymous-session';
import { useRouter } from 'next/navigation';

export function ActiveSearchesPage() {
  const [selectedSearch, setSelectedSearch] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: authSession } = useSession();
  const { listSessions, anonymousId } = useAnonymousSession();
  const router = useRouter();

  useEffect(() => {
    // Wait a bit for anonymous token to be set if needed
    const timer = setTimeout(() => {
      fetchSessions();
    }, 100);
    return () => clearTimeout(timer);
  }, [authSession, anonymousId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const sessionList = await listSessions();
      setSessions(sessionList || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const mockActiveSearches = [
    {
      id: 1,
      name: 'Senior Frontend Developer',
      status: 'running',
      progress: 75,
      jobsFound: 42,
      applicationsSubmitted: 8,
      boards: ['LinkedIn', 'Indeed', 'Glassdoor'],
      location: 'Remote',
      salary: '$120k - $180k',
      duration: '2h 15m',
      estimatedRemaining: '45m',
      thumbnail: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'React Engineer Remote',
      status: 'running',
      progress: 50,
      jobsFound: 28,
      applicationsSubmitted: 5,
      boards: ['AngelList', 'RemoteOK'],
      location: 'Worldwide Remote',
      salary: '$100k - $160k',
      duration: '1h 32m',
      estimatedRemaining: '1h 20m',
      thumbnail: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Full Stack Developer',
      status: 'paused',
      progress: 30,
      jobsFound: 77,
      applicationsSubmitted: 12,
      boards: ['Stack Overflow', 'Dice', 'Monster'],
      location: 'San Francisco, CA',
      salary: '$130k - $200k',
      duration: '45m',
      estimatedRemaining: 'Paused',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop'
    }
  ];

  // Transform real sessions to UI format
  const activeSearches = sessions.map((session, index) => ({
    id: session.id,
    name: session.userMetadata?.searchName || `Search ${index + 1}`,
    status: session.status === 'RUNNING' ? 'running' : session.status === 'COMPLETED' ? 'paused' : 'paused',
    progress: session.status === 'RUNNING' ? 50 : session.status === 'COMPLETED' ? 100 : 0,
    jobsFound: session.userMetadata?.jobsFound || 0,
    applicationsSubmitted: session.userMetadata?.applicationsSubmitted || 0,
    boards: session.userMetadata?.boards || [],
    location: session.userMetadata?.location || 'Unknown',
    salary: session.userMetadata?.salary || 'Not specified',
    duration: calculateDuration(session.createdAt, session.updatedAt),
    estimatedRemaining: session.status === 'RUNNING' ? 'In progress' : 'N/A',
    thumbnail: mockActiveSearches[index % mockActiveSearches.length]?.thumbnail || 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop'
  }));

  const calculateDuration = (createdAt: string, updatedAt: string) => {
    const start = new Date(createdAt).getTime();
    const end = new Date(updatedAt).getTime();
    const duration = end - start;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (selectedSearch !== null) {
    const search = activeSearches.find(s => s.id === selectedSearch);
    if (search) {
      return (
        <SearchDetailView 
          search={search} 
          onBack={() => setSelectedSearch(null)} 
        />
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading active searches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={fetchSessions}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Active Searches</h1>
          <p className="text-muted-foreground">
            Monitor and manage your running job search sessions.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/job-search')}>
          <Search className="h-4 w-4 mr-2" />
          New Search
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-2xl">{activeSearches.filter(s => s.status === 'running').length}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobs Found</p>
                <p className="text-2xl">{activeSearches.reduce((sum, s) => sum + s.jobsFound, 0)}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-2xl">{activeSearches.reduce((sum, s) => sum + s.applicationsSubmitted, 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Time</p>
                <p className="text-2xl">{activeSearches.length > 0 ? activeSearches[0].duration : '0m'}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeSearches.map((search) => (
          <Card key={search.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <div 
              className="relative h-32 bg-cover bg-center rounded-t-lg"
              style={{ backgroundImage: `url(${search.thumbnail})` }}
            >
              <div className="absolute inset-0 bg-black/40 rounded-t-lg" />
              <div className="absolute top-3 right-3">
                <Badge 
                  variant={search.status === 'running' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {search.status}
                </Badge>
              </div>
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="font-medium">{search.name}</h3>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <MapPin className="h-3 w-3" />
                  {search.location}
                </div>
              </div>
            </div>
            
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>{search.progress}%</span>
              </div>
              <Progress value={search.progress} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Jobs Found</p>
                  <p className="font-medium">{search.jobsFound}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Applied</p>
                  <p className="font-medium">{search.applicationsSubmitted}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {search.boards.map((board: string) => (
                  <Badge key={board} variant="outline" className="text-xs">
                    {board}
                  </Badge>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Duration: {search.duration}</span>
                  <span>ETA: {search.estimatedRemaining}</span>
                </div>
                <div className="mt-1">{search.salary}</div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedSearch(search.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                {search.status === 'running' ? (
                  <Button size="sm" variant="outline">
                    <Pause className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline">
                    <PlayCircle className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Square className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for no searches */}
      {activeSearches.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <PlayCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="mb-2">No Active Searches</h3>
            <p className="text-muted-foreground mb-4">
              Start your first automated job search to see it here.
            </p>
            <Button onClick={() => router.push('/dashboard/job-search')}>
              <Search className="h-4 w-4 mr-2" />
              Start Your First Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}