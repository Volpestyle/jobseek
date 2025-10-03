# Jobseek CDK Infrastructure

This directory contains the AWS CDK infrastructure code for the Jobseek application.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 18+ installed
3. AWS CDK CLI installed: `npm install -g aws-cdk`

## Setup

### 1. Install Dependencies

```bash
cd cdk
npm install
```

### 2. Configure Secrets

Before deploying, you need to create the following secrets in AWS Secrets Manager:

#### WallCrawler API Key
```bash
aws secretsmanager create-secret \
  --name jobseek/wallcrawler-api-key \
  --description "WallCrawler API key for job searches" \
  --secret-string "your-wallcrawler-api-key"
```

### 3. Update Configuration

Edit the config files in `cdk/config/` to match your setup:
- Provide the correct `wallcrawlerApiKeySecretName`
- Set custom domains and monitoring preferences if applicable

## Deployment

### Deploy to Development
```bash
npm run deploy:dev
```

### Deploy to Staging
```bash
npm run deploy:staging
```

### Deploy to Production
```bash
npm run deploy:prod
```

### View Changes Before Deploying
```bash
npm run diff
```

## Environment Variables

Populate `.env.<env>` files at the repository root. The deploy script reads them and pushes values to Secrets Manager + Lambda:

- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
- `TWITTER_CLIENT_ID`: Twitter/X OAuth Client ID (optional)
- `TWITTER_CLIENT_SECRET`: Twitter/X OAuth Client Secret (optional)
- `AUTH_SECRET`: Auth.js encryption secret (generate with `openssl rand -base64 32`)
- `ANONYMOUS_JWT_SECRET`: Secret for anonymous session issuance/refresh
- `WALLCRAWLER_API_URL`: Base URL for Wallcrawler
- `WALLCRAWLER_PROJECT_ID`: Wallcrawler project identifier
- `ANTHROPIC_API_KEY`: Key for AI-assisted summarisation (optional)
- `AUTH_REDIRECT_ALLOWLIST`: Comma-delimited list of allowed callback origins (e.g. CloudFront + custom domains)
- `VITE_APP_ENV`: Environment label surfaced to the client (`dev`, `staging`, etc.)

After editing `.env.<env>` at the repo root, run `pnpm secrets:<env>` (shorthand for `pnpm --filter @jobseek/cdk secrets:<env>`) to sync values into AWS Secrets Manager. The script also stores the raw env file in `jobseek/env-file-<env>` so CI/CD can recreate `.env.<env>` automatically.

## Stack Architecture

### 1. Backend Stack
- **DynamoDB Single Table**: Uses single table design to store all user data
  - User profiles
  - Saved job listings
  - Search preferences
  - Job applications
  - Custom job boards
- **S3 Bucket**: Resume storage
- **Lambda Functions**: Scheduled job searches

### 2. Web Stack
- **S3 Bucket (Static Assets)**: Stores the built Vite client
- **CloudFront Distribution**: Serves static assets globally and routes `/api/*` to Lambda@Edge
- **Lambda@Edge (Hono)**: Runs the API in us-east-1 with access to DynamoDB and S3
- **Bucket Deployment**: Pushes the `dist/` directory to S3 and invalidates CloudFront

### 3. Monitoring Stack (Production only)
- **CloudWatch Dashboard**: System overview and metrics
- **Alarms**: Alerts for errors and throttling
- **Cost Tracking**: Estimated monthly costs

## Cost Estimates

- **Development**: $1-3/month
- **Staging**: $5-10/month
- **Production**: $10-30/month (for 1K users)

## Useful Commands

- `npm run build`: Compile TypeScript to JavaScript
- `npm run watch`: Watch for changes and compile
- `cdk synth`: Synthesize CloudFormation templates
- `cdk diff`: Compare deployed stack with current state
- `cdk docs`: Open CDK documentation

## Troubleshooting

### DynamoDB Throttling
If you see throttling errors:
1. Check the CloudWatch dashboard
2. Consider switching to provisioned capacity for production
3. Implement exponential backoff in your application

### Lambda Timeouts
The search scheduler has a 15-minute timeout. If searches take longer:
1. Optimize the search logic
2. Consider breaking into smaller batches
3. Use Step Functions for complex workflows

## Clean Up

To remove all resources (WARNING: This will delete all data):

```bash
# For non-production environments only
cdk destroy --all --context environment=dev
```

For production, manually backup data before destroying stacks.
