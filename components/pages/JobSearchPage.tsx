"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Upload,
  Linkedin,
  Plus,
  X,
  Save,
  Play,
  MapPin,
  DollarSign,
  Clock,
  Star,
  StarOff,
  Edit,
  Trash2,
} from "lucide-react";
import { useSavedBoards } from "@/hooks/use-saved-boards";
import { useSavedSearches } from "@/hooks/use-saved-searches";
import { Skeleton } from "../ui/skeleton";
import { SavedSearch } from "@/lib/storage/storage.service";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";

export function JobSearchPage() {
  const {
    allBoards,
    savedBoardIds,
    isLoading: boardsLoading,
    toggleBoardSaved,
    isBoardSaved,
  } = useSavedBoards();
  const {
    searches,
    isLoading: searchesLoading,
    saveSearch,
    updateSearch,
    deleteSearch,
  } = useSavedSearches();
  
  const router = useRouter();
  const { data: authSession } = useSession();
  const { anonymousId } = useAnonymousSession();

  // Form state
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [activeTab, setActiveTab] = useState("new-search");
  const [searchName, setSearchName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<string[]>([]);
  const [jobType, setJobType] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState<string[]>([]);
  const [industry, setIndustry] = useState<string[]>([]);
  const [isRemote, setIsRemote] = useState(false);
  const [isHybrid, setIsHybrid] = useState(false);
  const [isVisaSponsor, setIsVisaSponsor] = useState(false);
  const [runFrequency, setRunFrequency] = useState("daily");
  const [isActive, setIsActive] = useState(true);

  // Other state
  const [skills, setSkills] = useState<string[]>([
    "React",
    "TypeScript",
    "Node.js",
  ]);
  const [newSkill, setNewSkill] = useState("");
  const [deleteConfirmSearch, setDeleteConfirmSearch] =
    useState<SavedSearch | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [runningSearchId, setRunningSearchId] = useState<string | null>(null);

  // Initialize selectedBoards with saved boards when loaded
  React.useEffect(() => {
    if (
      !boardsLoading &&
      savedBoardIds.length > 0 &&
      selectedBoards.length === 0 &&
      !editingSearch
    ) {
      setSelectedBoards(savedBoardIds.slice(0, 2)); // Select first 2 saved boards by default
    }
  }, [boardsLoading, savedBoardIds, selectedBoards.length, editingSearch]);

  // Track unsaved changes
  React.useEffect(() => {
    if (!editingSearch) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges =
      searchName !== editingSearch.name ||
      keywords !== editingSearch.keywords ||
      location !== editingSearch.location ||
      JSON.stringify(selectedBoards) !==
        JSON.stringify(editingSearch.jobBoards) ||
      salaryMin !== (editingSearch.filters?.salaryMin?.toString() || "") ||
      salaryMax !== (editingSearch.filters?.salaryMax?.toString() || "") ||
      JSON.stringify(experienceLevel) !==
        JSON.stringify(editingSearch.filters?.experienceLevel || []) ||
      JSON.stringify(jobType) !==
        JSON.stringify(editingSearch.filters?.jobType || []) ||
      JSON.stringify(companySize) !==
        JSON.stringify(editingSearch.filters?.companySize || []) ||
      JSON.stringify(industry) !==
        JSON.stringify(editingSearch.filters?.industry || []) ||
      isRemote !==
        (editingSearch.workPreferences?.remote ||
          editingSearch.filters?.remote ||
          false) ||
      isHybrid !== (editingSearch.workPreferences?.hybrid || false) ||
      isVisaSponsor !== (editingSearch.workPreferences?.visaSponsor || false) ||
      runFrequency !== (editingSearch.runFrequency || "daily") ||
      isActive !== editingSearch.isActive ||
      JSON.stringify(skills) !==
        JSON.stringify(
          editingSearch.skills || editingSearch.filters?.skills || []
        );

    setHasUnsavedChanges(hasChanges);
  }, [
    editingSearch,
    searchName,
    keywords,
    location,
    selectedBoards,
    salaryMin,
    salaryMax,
    experienceLevel,
    jobType,
    companySize,
    industry,
    isRemote,
    isHybrid,
    isVisaSponsor,
    runFrequency,
    isActive,
    skills,
  ]);

  // Load search data for editing
  const handleEditSearch = (search: SavedSearch) => {
    console.log("Editing search:", search);
    setEditingSearch(search);
    setSearchName(search.name);
    setKeywords(search.keywords);
    setLocation(search.location);
    setSelectedBoards(search.jobBoards);
    setSalaryMin(search.filters?.salaryMin?.toString() || "");
    setSalaryMax(search.filters?.salaryMax?.toString() || "");
    setExperienceLevel(search.filters?.experienceLevel || []);
    setJobType(search.filters?.jobType || []);
    setCompanySize(search.filters?.companySize || []);
    setIndustry(search.filters?.industry || []);
    setIsRemote(
      search.workPreferences?.remote || search.filters?.remote || false
    );
    setIsHybrid(search.workPreferences?.hybrid || false);
    setIsVisaSponsor(search.workPreferences?.visaSponsor || false);
    setRunFrequency(search.runFrequency || "daily");
    setIsActive(search.isActive);
    setSkills(search.skills || search.filters?.skills || []);
    setActiveTab("new-search");
    console.log("Active tab set to:", "new-search");
  };

  // Reset form
  const resetForm = () => {
    setEditingSearch(null);
    setSearchName("");
    setKeywords("");
    setLocation("");
    setSelectedBoards(savedBoardIds.slice(0, 2));
    setSalaryMin("");
    setSalaryMax("");
    setExperienceLevel([]);
    setJobType([]);
    setCompanySize([]);
    setIndustry([]);
    setIsRemote(false);
    setIsHybrid(false);
    setIsVisaSponsor(false);
    setRunFrequency("daily");
    setIsActive(true);
    setSkills(["React", "TypeScript", "Node.js"]);
    setHasUnsavedChanges(false);
  };

  // Handle save/update
  const handleSaveSearch = async () => {
    try {
      const searchData = {
        name: searchName,
        keywords,
        location,
        jobBoards: selectedBoards,
        filters: {
          salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
          salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
          experienceLevel:
            experienceLevel.length > 0 ? experienceLevel : undefined,
          jobType: jobType.length > 0 ? jobType : undefined,
          companySize: companySize.length > 0 ? companySize : undefined,
          industry: industry.length > 0 ? industry : undefined,
          remote: isRemote,
        },
        skills: skills.length > 0 ? skills : undefined,
        workPreferences: {
          remote: isRemote,
          hybrid: isHybrid,
          visaSponsor: isVisaSponsor,
        },
        runFrequency,
        isActive,
        isEditable: true,
      };

      if (editingSearch) {
        await updateSearch({
          ...editingSearch,
          ...searchData,
        });
        toast.success("Search updated successfully");
        setHasUnsavedChanges(false);
      } else {
        await saveSearch(searchData);
        toast.success("Search saved successfully");
        resetForm();
        setActiveTab("saved-searches");
      }
    } catch (error) {
      console.error("Failed to save search:", error);
      toast.error(
        editingSearch ? "Failed to update search" : "Failed to save search"
      );
    }
  };

  // Handle delete
  const handleDeleteSearch = async (search: SavedSearch) => {
    try {
      await deleteSearch(search.searchId);
      toast.success("Search deleted successfully");
      setDeleteConfirmSearch(null);
    } catch (error) {
      console.error("Failed to delete search:", error);
      toast.error("Failed to delete search");
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const toggleBoard = (boardId: string) => {
    setSelectedBoards((prev) =>
      prev.includes(boardId)
        ? prev.filter((id) => id !== boardId)
        : [...prev, boardId]
    );
  };

  // Run a job search
  const handleRunSearch = async (searchData?: SavedSearch) => {
    try {
      // Set which search is running
      setRunningSearchId(searchData?.searchId || 'new');
      
      // Use provided search data or current form data
      const searchKeywords = searchData?.keywords || keywords;
      const searchLocation = searchData?.location || location;
      const searchBoards = searchData?.jobBoards || selectedBoards;
      const searchSalary = searchData ? 
        (searchData.filters?.salaryMin && searchData.filters?.salaryMax ? 
          `${searchData.filters.salaryMin}-${searchData.filters.salaryMax}` : undefined) :
        (salaryMin && salaryMax ? `${salaryMin}-${salaryMax}` : undefined);

      if (!searchKeywords || searchBoards.length === 0) {
        toast.error("Keywords and at least one job board are required");
        return;
      }

      // Start a new Wallcrawler session
      const response = await fetch('/api/wallcrawler/search/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: searchKeywords,
          location: searchLocation,
          boards: searchBoards,
          salary: searchSalary,
          anonymousId: anonymousId || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start search');
      }

      const { sessionId, debugUrl } = await response.json();

      toast.success("Search started successfully!");
      
      // Navigate to active searches page to see the running search
      router.push('/dashboard/active-searches');
    } catch (error) {
      console.error("Failed to run search:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start search");
    } finally {
      setRunningSearchId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Job Search</h1>
        <p className="text-muted-foreground">
          Configure your automated job search parameters and preferences.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="new-search">
            {editingSearch ? "Edit Search" : "New Search"}
          </TabsTrigger>
          <TabsTrigger value="saved-searches">Saved Searches</TabsTrigger>
          <TabsTrigger value="job-boards">Job Boards</TabsTrigger>
        </TabsList>

        <TabsContent value="new-search" className="space-y-6">
          {/* Edit/New Search Header */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              {editingSearch ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      Editing: {editingSearch.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Modify your search parameters below
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      New Search{searchName && `: ${searchName}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure your automated job search
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 items-center">
              <Button
                onClick={() => handleRunSearch()}
                disabled={!keywords || selectedBoards.length === 0 || runningSearchId === 'new'}
              >
                <Play className="h-4 w-4 mr-2" />
                {runningSearchId === 'new' ? "Starting..." : "Run Search"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveSearch}
                disabled={!searchName || !keywords || selectedBoards.length === 0}
                className={
                  editingSearch && hasUnsavedChanges
                    ? "border-yellow-500 hover:border-yellow-600"
                    : editingSearch && !hasUnsavedChanges
                    ? "border-green-500 hover:border-green-600"
                    : ""
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {editingSearch ? "Update Search" : "Save Search"}
              </Button>
              
              <div className="ml-auto flex gap-3">
                <Button variant="outline" className="h-auto py-2 px-4">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Upload Resume</div>
                      <div className="text-xs text-muted-foreground">PDF, DOC, DOCX</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-2 px-4">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Import LinkedIn</div>
                      <div className="text-xs text-muted-foreground">Auto-populate</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Search Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Search Parameters</CardTitle>
                <CardDescription>
                  Define what type of jobs you&apos;re looking for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search-name">Search Name</Label>
                  <Input
                    id="search-name"
                    placeholder="e.g. My Remote Developer Search"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-title">Job Title / Keywords</Label>
                  <Input
                    id="job-title"
                    placeholder="e.g. Senior Frontend Developer"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. San Francisco, CA or Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salary-min">Min Salary</Label>
                    <Input
                      id="salary-min"
                      placeholder="e.g. 80000"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary-max">Max Salary</Label>
                    <Input
                      id="salary-max"
                      placeholder="e.g. 150000"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select
                    value={experienceLevel[0] || ""}
                    onValueChange={(value) => setExperienceLevel([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead/Principal</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-type">Job Type</Label>
                  <Select
                    value={jobType[0] || ""}
                    onValueChange={(value) => setJobType([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Skills and Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Skills & Preferences</CardTitle>
                <CardDescription>
                  Add your skills and job preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Required Skills</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 w-4 h-4"
                          onClick={() => removeSkill(skill)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addSkill()}
                    />
                    <Button onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-size">Company Size</Label>
                  <Select
                    value={companySize[0] || ""}
                    onValueChange={(value) => setCompanySize([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup (1-50)</SelectItem>
                      <SelectItem value="small">Small (51-200)</SelectItem>
                      <SelectItem value="medium">Medium (201-1000)</SelectItem>
                      <SelectItem value="large">Large (1000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={industry[0] || ""}
                    onValueChange={(value) => setIndustry([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Work Preferences</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remote"
                        checked={isRemote}
                        onCheckedChange={(checked) =>
                          setIsRemote(checked as boolean)
                        }
                      />
                      <Label htmlFor="remote">Remote work</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hybrid"
                        checked={isHybrid}
                        onCheckedChange={(checked) =>
                          setIsHybrid(checked as boolean)
                        }
                      />
                      <Label htmlFor="hybrid">Hybrid work</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="visa-sponsor"
                        checked={isVisaSponsor}
                        onCheckedChange={(checked) =>
                          setIsVisaSponsor(checked as boolean)
                        }
                      />
                      <Label htmlFor="visa-sponsor">Visa sponsorship</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Search Settings</CardTitle>
                <CardDescription>
                  Configure how often this search runs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="run-frequency">Run Frequency</Label>
                  <Select value={runFrequency} onValueChange={setRunFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="manual">Manual Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={(checked) =>
                      setIsActive(checked as boolean)
                    }
                  />
                  <Label htmlFor="is-active">Active (run automatically)</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Job Boards Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Job Boards</CardTitle>
              <CardDescription>
                Choose which job boards to search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {boardsLoading
                  ? // Loading skeletons
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))
                  : // Show only saved boards
                    allBoards
                      .filter((board) => isBoardSaved(board.id))
                      .map((board) => (
                        <div
                          key={board.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={board.id}
                            checked={selectedBoards.includes(board.id)}
                            onCheckedChange={() => toggleBoard(board.id)}
                          />
                          <Label htmlFor={board.id} className="flex-1">
                            {board.name}
                          </Label>
                        </div>
                      ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved-searches">
          <Card>
            <CardHeader>
              <CardTitle>Saved Searches</CardTitle>
              <CardDescription>
                Your previously saved job search configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ))}
                </div>
              ) : searches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No saved searches yet. Create your first search above!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searches.map((search) => (
                    <div
                      key={search.searchId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{search.name}</h4>
                          {search.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {search.keywords} • {search.location}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{search.jobBoards.length} job boards</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {search.runFrequency}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              search.isActive
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            {search.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {search.isEditable && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log(
                                  "Edit button clicked for search:",
                                  search
                                );
                                handleEditSearch(search);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmSearch(search)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <Button 
                          size="sm"
                          onClick={() => handleRunSearch(search)}
                          disabled={runningSearchId === search.searchId}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {runningSearchId === search.searchId ? "Starting..." : "Run"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={!!deleteConfirmSearch}
            onOpenChange={() => setDeleteConfirmSearch(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Search</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;
                  {deleteConfirmSearch?.name}
                  &quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteConfirmSearch &&
                    handleDeleteSearch(deleteConfirmSearch)
                  }
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="job-boards">
          <Card>
            <CardHeader>
              <CardTitle>Manage Job Boards</CardTitle>
              <CardDescription>
                Save your preferred job boards for quick access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {boardsLoading
                  ? // Loading skeletons
                    Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))
                  : allBoards.map((board) => {
                      const saved = isBoardSaved(board.id);
                      return (
                        <div
                          key={board.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1 pr-2">
                            <h4 className="font-medium">{board.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {board.description}
                            </p>
                          </div>
                          <Button
                            variant={saved ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleBoardSaved(board.id)}
                            disabled={boardsLoading}
                          >
                            {saved ? (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Saved
                              </>
                            ) : (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Saved boards appear in your job search options and can be
                  quickly selected for new searches.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
