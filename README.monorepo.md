# Jobseek Monorepo

This is a pnpm monorepo containing:

- `@jobseek/app` - Next.js application (root directory)
- `@jobseek/cdk` - AWS CDK infrastructure

## Prerequisites

- Node.js 18+
- pnpm 8+
- AWS CLI configured

## Getting Started

```bash
# Install all dependencies
pnpm install

# Run the Next.js app locally
pnpm dev

# Deploy infrastructure to AWS
pnpm cdk:dev    # Deploy to dev environment
pnpm cdk:staging # Deploy to staging
pnpm cdk:prod   # Deploy to production
```

## Project Structure

```
jobseek/
├── app/              # Next.js app source
├── components/       # React components
├── lib/             # Shared utilities
├── cdk/             # AWS CDK infrastructure
│   ├── bin/         # CDK app entry
│   ├── lib/         # CDK stacks
│   └── lambda/      # Lambda functions
├── package.json     # Root package.json
└── pnpm-workspace.yaml # pnpm workspace config
```

## Common Commands

### Development
```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build Next.js app
pnpm lint             # Run linting
```

### Infrastructure
```bash
pnpm cdk:diff         # Show what will change
pnpm cdk:synth        # Synthesize CloudFormation
pnpm cdk:dev          # Deploy to dev
pnpm cdk:staging      # Deploy to staging
pnpm cdk:prod         # Deploy to production
```

### Working with specific packages
```bash
pnpm --filter @jobseek/app dev     # Run dev server
pnpm --filter @jobseek/cdk build   # Build CDK
```

## Before First Deploy

1. Create AWS secrets (see cdk/README.md)
2. Update GitHub repository URL in cdk/lib/stacks/amplify-stack.ts
3. Configure your AWS credentials

## Cost Estimates

- Development: $1-3/month
- Production: $10-30/month (1K users)