# Jobseek - AI-Powered Job Search Platform

A Next.js application that uses Wallcrawler to automate job searching and applications across multiple job boards.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Tailwind CSS + shadcn/ui components
- **Authentication**: NextAuth.js with AWS Cognito (Google & X/Twitter OAuth)
- **Database**: AWS DynamoDB
- **File Storage**: AWS S3 (for resumes)
- **Browser Automation**: Wallcrawler SDK
- **Language**: TypeScript

## Features

- 🔍 **Smart Job Search**: AI-powered search across LinkedIn, Indeed, and Glassdoor
- 🤖 **Auto Apply**: Automatically apply to jobs matching your criteria
- 📊 **Job Management**: Track applications, save jobs, and organize with boards
- 🔄 **Active Searches**: Set up recurring searches that run automatically
- 📄 **Resume Management**: Upload and manage multiple resumes
- 👤 **Profile Management**: Manage your job seeker profile
- 🌓 **Dark/Light Mode**: Full theme support

## Project Structure

```
jobseek/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # NextAuth routes
│   │   ├── wallcrawler/  # Wallcrawler session management
│   │   ├── jobs/         # Job-related endpoints
│   │   ├── searches/     # Search management
│   │   ├── boards/       # Job boards
│   │   └── resume/       # Resume uploads
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Dashboard pages
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── pages/            # Page components
│   └── figma/            # Figma-specific components
├── lib/                   # Utility libraries
│   ├── auth/             # Authentication config
│   ├── db/               # DynamoDB service
│   ├── storage/          # S3 service
│   └── wallcrawler.server.ts # Wallcrawler service
└── public/               # Static assets
```

## Setup Instructions

1. **Clone the repository and install dependencies:**
   ```bash
   cd jobseek
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

3. **Configure AWS Cognito:**
   - Create a User Pool in AWS Cognito
   - Enable Google and X/Twitter as identity providers
   - Configure OAuth 2.0 settings with callback URL: `http://localhost:3000/api/auth/callback/cognito`

4. **Set up AWS resources:**
   - Create DynamoDB tables (see table names in `.env.example`)
   - Create an S3 bucket for resume storage
   - Configure IAM permissions for your AWS credentials

5. **Configure Wallcrawler:**
   - Get your Wallcrawler API key and project ID
   - Add them to your `.env.local` file

6. **Run the development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `GET/POST /api/auth/*` - NextAuth.js endpoints

### Wallcrawler Sessions
- `POST /api/wallcrawler/session` - Create new browser session
- `GET /api/wallcrawler/session?sessionId={id}` - Get session details
- `DELETE /api/wallcrawler/session?sessionId={id}` - Terminate session

### Job Search
- `POST /api/wallcrawler/search` - Search for jobs
- `POST /api/wallcrawler/apply` - Apply to a job

### Job Management
- `GET /api/jobs/saved` - Get saved jobs
- `POST /api/jobs/saved` - Save a job
- `DELETE /api/jobs/saved?jobId={id}` - Delete saved job

### Search Management
- `GET /api/searches/saved` - Get saved searches
- `POST /api/searches/saved` - Save a search
- `DELETE /api/searches/saved?searchId={id}` - Delete search

### Job Boards
- `GET /api/boards` - Get job boards
- `POST /api/boards` - Create board
- `PUT /api/boards` - Add/remove jobs from board
- `DELETE /api/boards?boardId={id}` - Delete board

### Resume Management
- `POST /api/resume/upload` - Get upload URL
- `GET /api/resume/upload` - List resumes
- `DELETE /api/resume/upload?s3Key={key}` - Delete resume

## Data Storage

### Browser Storage
- Wallcrawler session data
- Temporary search results

### DynamoDB
- User profiles (via NextAuth)
- Saved jobs
- Saved searches
- Job boards
- Application tracking

### S3
- Resume files

## Development Notes

- The app uses Next.js App Router with server components
- Authentication is handled via middleware
- All API routes require authentication except `/api/auth/*`
- Wallcrawler handles all browser automation in its own infrastructure
- File uploads use pre-signed S3 URLs for direct browser uploads

## Deployment

This app is ready for deployment but requires:
1. AWS infrastructure setup (Cognito, DynamoDB, S3)
2. Environment variables configuration
3. Wallcrawler production credentials

Consider using AWS CDK or Terraform for infrastructure as code (not included in this phase).