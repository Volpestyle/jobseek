# JobSeek Deployment Guide

## Quick Start

Deploy JobSeek to AWS in under 10 minutes:

```bash
# Clone repository
git clone <repository-url>
cd jobseek/cdk

# Install dependencies
pnpm install

# Deploy to development
pnpm deploy:dev
```

## Prerequisites

### Required Tools
```bash
# Check versions
node --version      # Required: v18.x+
aws --version       # Required: v2.x
cdk --version       # Required: v2.x
pnpm --version      # Required: v8.x+

# Install missing tools
npm install -g aws-cdk
npm install -g pnpm
```

### AWS Setup
```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

## Environment Configuration

### 1. Create Environment Files

```bash
# Development
cp .env.example .env.local
# Edit with your OAuth credentials and API keys

# Staging
cp .env.example .env.staging

# Production  
cp .env.example .env.prod
```

### 2. Required Environment Variables

```env
# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Security
NEXTAUTH_SECRET=generate-random-secret

# External APIs
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
WALLCRAWLER_API_KEY=wc_xxxxxxxxxxxx
```

### 3. Generate Secrets

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Create GitHub token
# Go to: GitHub Settings → Developer Settings → Personal Access Tokens
# Scopes needed: repo (for Amplify deployments)
```

## Deployment Commands

### Complete Deployment

Deploy both backend infrastructure and frontend:

```bash
# Development
pnpm deploy:dev

# Staging  
pnpm deploy:staging

# Production (requires confirmation)
pnpm deploy:prod
```

### Selective Deployment

#### Backend Only
```bash
# Deploy DynamoDB, S3, and other backend resources
pnpm deploy:backend:dev
pnpm deploy:backend:staging
pnpm deploy:backend:prod
```

#### Frontend Only
```bash
# Deploy Next.js app to Amplify
pnpm deploy:nextjs:dev
pnpm deploy:nextjs:staging  
pnpm deploy:nextjs:prod
```

#### Monitoring Stack
```bash
# Deploy CloudWatch dashboards and alarms
cd cdk
cdk deploy JobseekMonitoring-dev --context environment=dev
```

### Advanced Options

```bash
# Skip manual approval (dev only)
pnpm deploy:dev:auto

# Use existing secrets
pnpm deploy:dev:skip-secrets

# Deploy specific stack
cdk deploy JobseekBackend-dev

# Preview changes
cdk diff --all --context environment=dev
```

## Environment-Specific Configurations

### Development
```json
{
  "environment": "dev",
  "branchName": "main",
  "domainName": "",
  "enableBackups": false,
  "enableDetailedMonitoring": false
}
```

### Staging
```json
{
  "environment": "staging",
  "branchName": "staging",
  "domainName": "staging.jobseek.com",
  "enableBackups": true,
  "enableDetailedMonitoring": true
}
```

### Production
```json
{
  "environment": "prod",
  "branchName": "production",
  "domainName": "jobseek.com",
  "enableBackups": true,
  "enableDetailedMonitoring": true,
  "alarmEmail": "ops@jobseek.com"
}
```

## Post-Deployment Steps

### 1. Verify Deployment

```bash
# Run verification script
pnpm verify:dev

# Manual checks
aws amplify list-apps
aws dynamodb list-tables
aws lambda list-functions
aws s3 ls
```

### 2. Configure OAuth Providers

#### Google Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Add authorized redirect URI:
   ```
   https://[amplify-domain]/api/auth/callback/google
   ```

#### Twitter Developer Portal
1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Navigate to your app settings
3. Add callback URL:
   ```
   https://[amplify-domain]/api/auth/callback/twitter
   ```

### 3. Trigger Initial Build

```bash
# Get Amplify app ID
aws amplify list-apps

# Start build
aws amplify start-job \
  --app-id [APP-ID] \
  --branch-name main \
  --job-type RELEASE
```

### 4. Test Application

1. **Access Application**
   ```bash
   # Get app URL
   aws amplify get-app --app-id [APP-ID] \
     --query "app.defaultDomain"
   ```

2. **Test Authentication**
   - Click "Sign In"
   - Test Google OAuth
   - Test Twitter OAuth

3. **Test Core Features**
   - Create a job search
   - Upload a resume
   - Save job preferences

## Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Failed
```bash
# Error: "Policy contains invalid principals"
# Solution:
aws configure  # Reconfigure credentials
cdk bootstrap --trust=ACCOUNT-ID
```

#### 2. Amplify Build Failed
```bash
# Check build logs
aws amplify get-job --app-id [APP-ID] --branch-name main --job-id [JOB-ID]

# Common fixes:
# - Ensure environment variables are set
# - Check package.json scripts
# - Verify GitHub token permissions
```

#### 3. DynamoDB Throttling
```bash
# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ReadThrottleEvents \
  --dimensions Name=TableName,Value=jobseek-users-dev \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Debug Commands

```bash
# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name JobseekBackend-dev

# Amplify deployment logs
aws amplify list-jobs --app-id [APP-ID] --branch-name main

# DynamoDB table details
aws dynamodb describe-table --table-name jobseek-users-dev
```

## Monitoring & Maintenance

### CloudWatch Dashboard

Access metrics at: `https://console.aws.amazon.com/cloudwatch`

**Key Metrics:**
- DynamoDB read/write capacity
- Amplify build success rate
- API Gateway latency

### Alarms

**Critical Alarms (Production):**
- DynamoDB throttles > 10
- Amplify build success < 95%
- API 5xx errors > 10 in 5 minutes

### Log Analysis

```bash
# Export logs for analysis
aws logs create-export-task \
  --log-group-name /aws/amplify/jobseek-prod \
  --from 1640995200000 \
  --to 1641081600000 \
  --destination jobseek-logs-export \
  --destination-prefix lambda-errors
```

## Updating & Rollback

### Update Application

```bash
# Update CDK code
git pull origin main

# Deploy updates
pnpm deploy:dev

# For production, review changes first
cdk diff --all --context environment=prod
pnpm deploy:prod
```

### Rollback Procedures

```bash
# Rollback Amplify to previous build
aws amplify list-jobs --app-id [APP-ID] --branch-name main
aws amplify start-job \
  --app-id [APP-ID] \
  --branch-name main \
  --job-type RELEASE \
  --commit-id [PREVIOUS-COMMIT]

# Rollback CDK stack
# Note: This may cause data loss - backup first!
cdk destroy JobseekBackend-dev
git checkout [previous-version]
cdk deploy JobseekBackend-dev
```

## Cost Management

### Estimate Costs

```bash
# View current costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --filter file://cost-filter.json
```

### Cost Optimization

1. **Development Environments**
   - Destroy when not in use
   - Minimize resource usage
   - Disable monitoring

2. **Production Optimization**
   - Enable S3 lifecycle policies
   - Use DynamoDB auto-scaling

### Destroy Resources

```bash
# Destroy specific environment
cdk destroy --all --context environment=dev

# Clean up S3 buckets first
aws s3 rm s3://jobseek-resumes-dev-ACCOUNT --recursive

# Force destroy with cleanup
pnpm cleanup:dev:force
```

## Security Best Practices

### Secrets Rotation

```bash
# Rotate NextAuth secret
openssl rand -base64 32  # Generate new secret
pnpm secrets:prod        # Update in AWS

# Rotate API keys
# 1. Generate new keys in provider console
# 2. Update secrets:
aws secretsmanager update-secret \
  --secret-id jobseek/wallcrawler-api-key \
  --secret-string "new-api-key"
```

### Access Control

```bash
# Review IAM permissions
aws iam list-roles --query "Roles[?contains(RoleName, 'Jobseek')]"

# Enable MFA for production
aws iam enable-mfa-device \
  --user-name admin \
  --serial-number arn:aws:iam::ACCOUNT:mfa/admin \
  --authentication-code1 123456 \
  --authentication-code2 789012
```

## Support & Resources

- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Amplify Documentation**: https://docs.amplify.aws/
- **Next.js Documentation**: https://nextjs.org/docs
- **Repository Issues**: [GitHub Issues]
- **Team Contact**: devops@jobseek.com