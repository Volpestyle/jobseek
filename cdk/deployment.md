# Jobseek CDK Deployment Guide

## Table of Contents

1. [Prerequisites & Requirements](#prerequisites--requirements)
2. [Initial Setup Instructions](#initial-setup-instructions)
3. [Deployment Options](#deployment-options)
   - [Deploy Backend Infrastructure Only](#deploy-backend-infrastructure-only)
   - [Deploy Next.js Application Only](#deploy-nextjs-application-only)
   - [Deploy Everything (Full Deployment)](#deploy-everything-full-deployment)
4. [Manual Deployment Process](#manual-deployment-process)
5. [Stack Dependencies & Deployment Order](#stack-dependencies--deployment-order)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
8. [Architecture Overview](#architecture-overview)
9. [Security Considerations](#security-considerations)
10. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites & Requirements

### Required Tools

- **Node.js**: v18.x or higher
- **AWS CLI**: v2.x configured with appropriate credentials
- **AWS CDK**: v2.x (`npm install -g aws-cdk`)
- **pnpm**: v8.x or higher (for monorepo management)
- **Git**: For version control and Amplify deployments

### AWS Account Requirements

- AWS account with appropriate IAM permissions for:
  - CloudFormation (stack management)
  - DynamoDB (database provisioning)
  - Lambda (function deployment)
  - S3 (storage buckets)
  - Amplify (frontend hosting)
  - CloudWatch (monitoring)
  - Secrets Manager (credentials storage)
  - EventBridge (scheduled tasks)
  - IAM (role creation)

### Verification Steps

```bash
# Verify tool installations
node --version      # Should be v18.x or higher
aws --version       # Should be v2.x
cdk --version       # Should be v2.x
pnpm --version      # Should be v8.x or higher

# Verify AWS credentials
aws sts get-caller-identity

# Bootstrap CDK (if not already done)
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

## Initial Setup Instructions

### 1. Clone Repository and Install Dependencies

```bash
git clone <repository-url>
cd jobseek/cdk
pnpm install
```

### 2. Create GitHub Personal Access Token

- Navigate to GitHub Settings → Developer Settings → Personal Access Tokens
- Create a token with `repo` scope for Amplify deployments
- Save the token securely - you'll need it in the next step

### 3. Set Up Environment Configuration

```bash
# Copy the environment template
cp .env.deploy.example .env.deploy.dev

# Edit the file with your values
# IMPORTANT: Fill in all required values
nano .env.deploy.dev
```

### 4. Make Scripts Executable

```bash
chmod +x deploy.sh verify-deployment.sh deploy-secrets.ts
```

## Deployment Options

You can now deploy the backend infrastructure and Next.js application separately or together:

### Deploy Backend Infrastructure Only

Deploy only the backend AWS resources (DynamoDB, Lambda, S3, etc.):

```bash
# From root directory
pnpm deploy:backend:dev      # Deploy to development
pnpm deploy:backend:staging  # Deploy to staging
pnpm deploy:backend:prod     # Deploy to production

# Or from cdk directory
cd cdk
./deploy-backend.sh dev
./deploy-backend.sh staging
./deploy-backend.sh prod

# With options
./deploy-backend.sh dev --skip-secrets  # Skip secrets deployment
./deploy-backend.sh dev --auto-approve  # Auto-approve CDK changes (dev only)
```

The backend deployment script will:
1. Check prerequisites (Node.js, AWS CLI, CDK, credentials)
2. Deploy secrets to AWS Secrets Manager (unless skipped)
3. Bootstrap CDK if needed
4. Deploy the Backend stack only
5. Display infrastructure details (table names, bucket names)

### Deploy Web Stack Only

Deploy only the CloudFront + Lambda@Edge web surface:

```bash
# From root directory
pnpm --filter @jobseek/cdk cdk:dev      # Deploy dev web + backend

# Or run the deploy helper (runs build + secrets + deploy)
cd cdk
./scripts/deploy.sh dev --skip-secrets  # deploy after secrets seeded
./scripts/deploy.sh staging
./scripts/deploy.sh prod
```

The deployment script will:
1. Build the Vite client (`pnpm build:deploy`)
2. Push secrets to AWS Secrets Manager (unless skipped)
3. Deploy backend + web stacks with CDK (DynamoDB, Lambda scheduler, S3, CloudFront, Lambda@Edge)
4. Print the CloudFront domain and verification steps

### Deploy Everything (Full Deployment)

Deploy both backend and Next.js app together:

```bash
# From root directory
pnpm cdk:dev      # Deploy all to development
pnpm cdk:staging  # Deploy all to staging
pnpm cdk:prod     # Deploy all to production

# Or from cdk directory
cd cdk
./deploy.sh dev
./deploy.sh staging
./deploy.sh prod

# With options
./deploy.sh dev --auto-approve     # Auto-approve CDK changes (dev only)
./deploy.sh dev --skip-secrets     # Skip secrets deployment
```

The full deployment script will:
1. Check all prerequisites
2. Deploy secrets to AWS Secrets Manager (unless skipped)
3. Bootstrap CDK if needed
4. Deploy all CDK stacks in the correct order
5. Run verification to confirm successful deployment

### Manual Step-by-Step Process

If you prefer to run each step manually:

### Step 1: Prepare Environment File

```bash
# For development
cp .env.deploy.example .env.deploy.dev
# Edit with your values

# For staging
cp .env.deploy.example .env.deploy.staging
# Edit with your values

# For production
cp .env.deploy.example .env.deploy.prod
# Edit with your values
```

### Step 2: Deploy Secrets and Get CDK Command

```bash
# Install dependencies for the deploy script
pnpm install

# Run the deploy script (example for dev environment)
npx ts-node deploy-secrets.ts dev

# Or for other environments
npx ts-node deploy-secrets.ts staging
npx ts-node deploy-secrets.ts prod
```

The script will:

1. Validate your environment file
2. Push GitHub token to AWS Secrets Manager
3. Push Wallcrawler API key to AWS Secrets Manager (if provided)
4. Generate a CDK deployment command with all environment variables
5. Save a context file for easier deployment

### Step 3: Deploy CDK Stacks

The script outputs two deployment options:

**Option A: Using Command Line Context (Recommended for CI/CD)**

```bash
cdk deploy --all \
  --context environment=dev \
  --context googleClientId="your-google-client-id" \
  --context googleClientSecret="your-google-client-secret" \
  --context twitterClientId="your-twitter-client-id" \
  --context twitterClientSecret="your-twitter-client-secret" \
  --context authSecret="your-auth-secret"
```

**Option B: Using Context File (Recommended for Manual Deployment)**

```bash
# The script creates a context file: cdk.context.<environment>.json
cdk deploy --all --context-file cdk.context.dev.json
```

### Environment-Specific Deployment Examples

#### Development

```bash
# 1. Deploy secrets
npx ts-node deploy-secrets.ts dev

# 2. Deploy all stacks
cdk deploy --all --context-file cdk.context.dev.json --require-approval never
```

#### Staging

```bash
# 1. Deploy secrets
npx ts-node deploy-secrets.ts staging

# 2. Deploy with manual approval
cdk deploy --all --context-file cdk.context.staging.json
```

#### Production

```bash
# 1. Deploy secrets
npx ts-node deploy-secrets.ts prod

# 2. Review changes first
cdk diff --all --context-file cdk.context.prod.json

# 3. Deploy with explicit approval
cdk deploy --all --context-file cdk.context.prod.json --require-approval broadening
```

### Backend Stack Outputs Used by Other Stacks

- `UserPoolId` → Amplify authentication configuration
- `UserPoolClientId` → Amplify client authentication
- `ApiEndpoint` → Amplify API integration
- `DynamoTableName` → Monitoring dashboard configuration
- `ResumeBucketName` → Amplify file upload configuration

### Critical Deployment Notes

1. **Backend Stack MUST be deployed first** - Other stacks reference its outputs
2. **Amplify Stack requires manual build trigger** - First deployment needs manual build in AWS Console
3. **Monitoring Stack is optional** - Can be skipped for development environments

## Post-Deployment Verification

### Stream-Safe Verification Script

For streaming or screen-sharing scenarios, use the included verification script that checks your deployment without exposing any sensitive information:

```bash
# Make script executable (first time only)
chmod +x verify-deployment.sh

# Run verification for your environment
./verify-deployment.sh dev
./verify-deployment.sh staging
./verify-deployment.sh prod
```

This script will:
- ✅ Confirm secrets exist without showing values
- ✅ Check all AWS resources are deployed
- ✅ Display only safe metadata (IDs, statuses, counts)
- ✅ List environment variable names without values
- ✅ Provide a summary with next steps

### Manual Verification Commands

### 1. Verify Secrets Deployment (Stream-Safe)

```bash
# Check if GitHub token exists (without showing value)
aws secretsmanager describe-secret \
  --secret-id jobseek/github-token \
  --query 'Name' \
  --output text && echo "✅ GitHub token exists"

# Check if Wallcrawler API key exists (if deployed)
aws secretsmanager describe-secret \
  --secret-id jobseek/wallcrawler-api-key \
  --query 'Name' \
  --output text 2>/dev/null && echo "✅ Wallcrawler API key exists" || echo "ℹ️  Wallcrawler API key not configured"

# Verify secret metadata (safe to show on stream)
aws secretsmanager describe-secret \
  --secret-id jobseek/github-token \
  --query '{Name:Name,LastChanged:LastChangedDate,Created:CreatedDate}'
```

### 2. Backend Stack Verification

```bash
# Verify DynamoDB table
aws dynamodb describe-table \
  --table-name jobseek-table-${ENVIRONMENT}

# Check Lambda functions
aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName, 'JobseekBackend-${ENVIRONMENT}')]"

# Verify S3 buckets
aws s3 ls | grep jobseek-${ENVIRONMENT}

# Test EventBridge rule
aws events list-rules \
  --name-prefix jobseek-scheduler-${ENVIRONMENT}
```

### 3. Amplify Stack Verification

```bash
# Get Amplify app details
aws amplify get-app \
  --app-id $(aws amplify list-apps --query "apps[?name=='jobseek-${ENVIRONMENT}'].appId" --output text)

# Check deployment status
aws amplify list-branches \
  --app-id $(aws amplify list-apps --query "apps[?name=='jobseek-${ENVIRONMENT}'].appId" --output text)

# Verify environment variables exist (without showing values)
aws amplify get-branch \
  --app-id $(aws amplify list-apps --query "apps[?name=='jobseek-${ENVIRONMENT}'].appId" --output text) \
  --branch-name ${AMPLIFY_BRANCH} \
  --query 'branch.environmentVariables' \
  --output json | jq 'keys[]' | while read key; do echo "✅ $key is configured"; done
```

### 4. End-to-End Testing

1. **Access Amplify URL**: Check AWS Amplify console for deployed URL
2. **Test Authentication**: Verify Google/Twitter OAuth login works
3. **Verify Environment Variables**: Check browser console for VITE_APP_ENV
4. **Test API Endpoints**: Verify CRUD operations work
5. **Check Scheduler**: Monitor CloudWatch logs for job execution

## Common Issues & Troubleshooting

### Issue 1: Deploy Script Permission Denied

```bash
# Error: permission denied: ./deploy-secrets.ts
# Solution:
chmod +x deploy-secrets.ts
```

### Issue 2: Missing Environment Variables

```bash
# Error: Missing required environment variables: GOOGLE_CLIENT_ID, AUTH_SECRET
# Solution: Ensure all required fields in .env.deploy.<environment> are filled
```

### Issue 3: CDK Bootstrap Failed

```bash
# Error: "Policy contains a statement with one or more invalid principals"
# Solution: Ensure AWS CLI is configured with valid credentials
aws configure
cdk bootstrap --trust=ACCOUNT-NUMBER
```

### Issue 4: Amplify Build Failed - Missing Env Vars

```bash
# Error: "AUTH_SECRET is not defined"
# Solution: Either redeploy with context variables or manually add in Amplify console
```

### Issue 5: GitHub Token Invalid

```bash
# Error: "Repository not found or you do not have permission"
# Solution: Ensure GitHub token has 'repo' scope and update in Secrets Manager
npx ts-node deploy-secrets.ts <environment>
```

### Issue 6: OAuth Redirect URI Mismatch

```bash
# Error: "redirect_uri_mismatch"
# Solution: Update OAuth provider with Amplify URLs:
# - Google Console: Add https://<branch>.<app-id>.amplifyapp.com/api/auth/callback/google
# - Twitter Developer Portal: Add callback URLs
```

## Architecture Overview

### System Components

#### Backend Stack (`backend-stack.ts`)

- **DynamoDB Table**: Single-table design with composite keys

  - Partition Key: `PK` (e.g., `USER#123`, `JOB#456`)
  - Sort Key: `SK` (e.g., `PROFILE`, `METADATA`)
  - GSI1-4: Various access patterns for queries

- **Lambda Functions**:

  - `search-scheduler`: Executes saved job searches periodically
  - Configured with EventBridge for scheduled execution

- **S3 Buckets**:
  - Resume storage bucket with lifecycle policies
  - Configured with encryption and versioning

#### Amplify Stack (`amplify-stack.ts`)

- **Next.js Application**: Server-side rendered React app
- **GitHub Integration**: Automated deployments on push
- **Environment Variables**: Now properly injected via CDK context
- **OAuth Integration**: Google and Twitter authentication

#### Monitoring Stack (`monitoring-stack.ts`)

- **CloudWatch Dashboard**: Real-time metrics visualization
- **Alarms**: Lambda errors, DynamoDB throttles, build failures
- **Log Groups**: Centralized logging with retention policies

### Data Flow

1. **User Request** → Amplify (Next.js) → API Routes
2. **Authentication** → NextAuth → OAuth Providers
3. **API Routes** → DynamoDB (via AWS SDK)
4. **File Uploads** → S3 (via presigned URLs)
5. **Scheduled Jobs** → EventBridge → Lambda → DynamoDB

## Security Considerations

### Secrets Management

1. **AWS Secrets Manager**: Stores deployment-time secrets (GitHub token, Wallcrawler API)
2. **Amplify Environment Variables**: Runtime secrets (OAuth credentials, NextAuth secret)
3. **No Hardcoded Secrets**: All sensitive data externalized
4. **Rotation Support**: Secrets can be rotated without code changes

### Application Security

1. **Authentication**: NextAuth with OAuth providers
2. **API Security**: Server-side API routes with authentication checks
3. **CORS Configuration**: Restrictive CORS policies
4. **HTTPS Only**: Enforced by Amplify

### Data Protection

1. **Encryption at Rest**: DynamoDB and S3 encryption enabled
2. **Encryption in Transit**: HTTPS enforced
3. **IAM Roles**: Least privilege access for all services
4. **No Direct Database Access**: All access through API routes

## Monitoring & Maintenance

### Key Metrics to Monitor

- **DynamoDB**: ConsumedCapacity, Throttles, Errors
- **Lambda**: Invocations, Duration, Errors, Throttles
- **Amplify**: Build success rate, deployment time
- **API**: Response times, error rates

### Regular Maintenance Tasks

#### Weekly

- Review CloudWatch alarms and logs
- Check for failed deployments
- Monitor cost trends

#### Monthly

- Rotate secrets (especially NextAuth secret)
- Review and update dependencies
- Analyze usage patterns for optimization

#### Quarterly

- Security audit of OAuth configurations
- Review IAM permissions
- Test disaster recovery procedures

### Updating Environment Variables

```bash
# Option 1: Redeploy with new values
npx ts-node deploy-secrets.ts <environment>
cdk deploy --all --context-file cdk.context.<environment>.json

# Option 2: Update in Amplify Console
# Go to App settings → Environment variables → Edit
```

## Quick Reference Commands

### Deployment Commands (via npm/pnpm)
```bash
# Deploy backend infrastructure only
pnpm deploy:backend              # Deploy backend to dev (default)
pnpm deploy:backend:dev          # Deploy backend to dev
pnpm deploy:backend:staging      # Deploy backend to staging
pnpm deploy:backend:prod         # Deploy backend to production

# Deploy Next.js app only
pnpm deploy:nextjs               # Deploy Next.js to dev (default)
pnpm deploy:nextjs:dev           # Deploy Next.js to dev
pnpm deploy:nextjs:staging       # Deploy Next.js to staging
pnpm deploy:nextjs:prod          # Deploy Next.js to production

# Complete deployment (both backend and Next.js)
pnpm cdk:dev                     # Deploy all to dev
pnpm cdk:staging                 # Deploy all to staging
pnpm cdk:prod                    # Deploy all to production

# Legacy deployment commands (still available)
pnpm deploy:dev                  # Deploy all to dev
pnpm deploy:staging              # Deploy all to staging
pnpm deploy:prod                 # Deploy all to production
pnpm deploy:dev:auto             # Skip approval prompts (dev only)
pnpm deploy:dev:skip-secrets     # Use existing secrets

# Manage secrets only
pnpm secrets:dev                 # Update dev secrets
pnpm secrets:staging             # Update staging secrets
pnpm secrets:prod                # Update prod secrets

# Verify deployment (stream-safe)
pnpm verify                      # Verify current environment
pnpm verify:dev                  # Verify dev deployment
pnpm verify:staging              # Verify staging deployment
pnpm verify:prod                 # Verify prod deployment

# Cleanup failed deployments
pnpm cleanup:dev                 # Clean failed dev stacks (interactive)
pnpm cleanup:dev:force           # Force clean without prompts
pnpm cleanup:dev:web             # Clean only web stack
pnpm cleanup:staging             # Clean failed staging stacks
pnpm cleanup:prod                # Clean prod stacks (requires confirmation)

# Stack management
pnpm diff                        # Show pending changes
pnpm synth                       # Synthesize CloudFormation
pnpm destroy:dev                 # Destroy dev stack (CDK)
pnpm destroy:staging             # Destroy staging stack (CDK)
```

### Direct AWS Commands
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name JobseekBackend-dev

# View stack outputs
aws cloudformation describe-stacks \
  --stack-name JobseekBackend-dev \
  --query "Stacks[0].Outputs"

# View Lambda logs
aws logs tail /aws/lambda/jobseek-search-scheduler-dev --follow

# Manual CDK commands (if needed)
cdk deploy --all --context-file cdk.context.dev.json
cdk destroy --all --context-file cdk.context.dev.json
```

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
