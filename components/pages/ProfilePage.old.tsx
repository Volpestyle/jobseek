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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Upload,
  Plus,
  X,
  Save,
  Edit,
  Linkedin,
  Github,
  Globe,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export function ProfilePage() {
  const [skills, setSkills] = useState([
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "AWS",
    "Docker",
  ]);
  const [newSkill, setNewSkill] = useState("");

  const experience = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "Tech Solutions Inc.",
      duration: "2022 - Present",
      description:
        "Led development of React-based web applications serving 100k+ users. Implemented modern frontend architecture and mentored junior developers.",
    },
    {
      id: 2,
      title: "Frontend Developer",
      company: "StartupCorp",
      duration: "2020 - 2022",
      description:
        "Built responsive web applications using React and TypeScript. Collaborated with designers and backend developers to deliver high-quality products.",
    },
    {
      id: 3,
      title: "Junior Developer",
      company: "WebDev Agency",
      duration: "2019 - 2020",
      description:
        "Developed client websites using HTML, CSS, and JavaScript. Gained experience in modern web development practices and version control.",
    },
  ];

  const education = [
    {
      id: 1,
      degree: "Bachelor of Science in Computer Science",
      school: "University of Technology",
      year: "2019",
      description:
        "Focused on software engineering and web development. Graduated magna cum laude.",
    },
    {
      id: 2,
      degree: "Full Stack Web Development Bootcamp",
      school: "Code Academy",
      year: "2018",
      description:
        "Intensive 6-month program covering modern web technologies including React, Node.js, and databases.",
    },
  ];

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Profile</h2>
        <p className="text-muted-foreground">
          Manage your personal information, resume, and professional details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" defaultValue="Doe" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue="+1 (555) 123-4567" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" defaultValue="San Francisco, CA" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                defaultValue="Experienced frontend developer with 5+ years building modern web applications. Passionate about user experience and clean code. Expertise in React, TypeScript, and cloud technologies."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Links</CardTitle>
          <CardDescription>
            Add your professional social media and portfolio links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                  <Linkedin className="h-4 w-4" />
                </div>
                <Input
                  id="linkedin"
                  placeholder="linkedin.com/in/username"
                  defaultValue="linkedin.com/in/johndoe"
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                  <Github className="h-4 w-4" />
                </div>
                <Input
                  id="github"
                  placeholder="github.com/username"
                  defaultValue="github.com/johndoe"
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio Website</Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                  <Globe className="h-4 w-4" />
                </div>
                <Input
                  id="portfolio"
                  placeholder="yourwebsite.com"
                  defaultValue="johndoe.dev"
                  className="rounded-l-none"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>
            Upload your resume or import from LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="h-24 border-dashed">
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6" />
                <span>Upload Resume</span>
                <span className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX
                </span>
              </div>
            </Button>
            <Button variant="outline" className="h-24 border-dashed">
              <div className="flex flex-col items-center gap-2">
                <Linkedin className="h-6 w-6" />
                <span>Import from LinkedIn</span>
                <span className="text-xs text-muted-foreground">
                  Auto-populate profile
                </span>
              </div>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Current resume:{" "}
            <span className="text-foreground">john_doe_resume_2025.pdf</span>{" "}
            (uploaded 2 days ago)
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>
            Add your technical and professional skills
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Work Experience</CardTitle>
          <CardDescription>
            Add your professional work experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {experience.map((exp) => (
            <div key={exp.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4>{exp.title}</h4>
                  <p className="text-muted-foreground">{exp.company}</p>
                  <p className="text-sm text-muted-foreground">
                    {exp.duration}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm">{exp.description}</p>
            </div>
          ))}
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Experience
          </Button>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
          <CardDescription>Add your educational background</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {education.map((edu) => (
            <div key={edu.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4>{edu.degree}</h4>
                  <p className="text-muted-foreground">{edu.school}</p>
                  <p className="text-sm text-muted-foreground">{edu.year}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm">{edu.description}</p>
            </div>
          ))}
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Profile
        </Button>
      </div>
    </div>
  );
}
