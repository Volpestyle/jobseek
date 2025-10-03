#!/bin/bash
# Jobseek One-Command Deployment Script
# Usage: ./deploy.sh [environment] [options]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
SKIP_SECRETS=${2:-false}
AUTO_APPROVE=""
NON_INTERACTIVE=false

# Show usage
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: ./deploy.sh [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  dev         Development environment (default)"
    echo "  staging     Staging environment"
    echo "  prod        Production environment"
    echo ""
    echo "Options:"
    echo "  --skip-secrets    Skip secrets deployment (use existing)"
    echo "  --auto-approve    Skip CDK approval prompts (dev only)"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                    # Deploy dev environment"
    echo "  ./deploy.sh staging            # Deploy staging environment"
    echo "  ./deploy.sh prod               # Deploy production environment"
    echo "  ./deploy.sh dev --skip-secrets # Deploy dev, skip secrets update"
    exit 0
fi

# Parse additional options
for arg in "$@"; do
    case $arg in
        --skip-secrets)
            SKIP_SECRETS=true
            ;;
        --auto-approve)
            if [[ "$ENVIRONMENT" == "dev" ]]; then
                AUTO_APPROVE="--require-approval never"
                NON_INTERACTIVE=true
            else
                echo -e "${YELLOW}⚠️  --auto-approve is only allowed for dev environment${NC}"
            fi
            ;;
        --non-interactive|--ci)
            NON_INTERACTIVE=true
            ;;
    esac
done

if [[ "${CI:-}" == "true" ]]; then
    NON_INTERACTIVE=true
fi

if [[ "$NON_INTERACTIVE" == "true" && -z "$AUTO_APPROVE" ]]; then
    AUTO_APPROVE="--require-approval never"
fi

echo -e "${BLUE}🚀 Jobseek Deployment Script${NC}"
echo -e "${BLUE}=========================${NC}"
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check CDK
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK is not installed${NC}"
    echo "Install with: npm install -g aws-cdk"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Check for environment file
# Map environment names to .env file names
case "$ENVIRONMENT" in
    dev|development|local)
        ENV_FILE_NAME=".env.local"
        ;;
    staging)
        ENV_FILE_NAME=".env.staging"
        ;;
    prod|production)
        ENV_FILE_NAME=".env.prod"
        ;;
    *)
        ENV_FILE_NAME=".env.$ENVIRONMENT"
        ;;
esac

LOCAL_ENV_FILE="./$ENV_FILE_NAME"
PARENT_ENV_FILE="../$ENV_FILE_NAME"

if [[ -f "$LOCAL_ENV_FILE" ]]; then
    ENV_FILE="$LOCAL_ENV_FILE"
elif [[ -f "$PARENT_ENV_FILE" ]]; then
    ENV_FILE="$PARENT_ENV_FILE"
else
    ENV_FILE="$PARENT_ENV_FILE"
fi

ENV_FILE_ABS=$(python3 -c "import os,sys; print(os.path.abspath(sys.argv[1]))" "$ENV_FILE" 2>/dev/null || echo "$ENV_FILE")

fetch_env_from_secrets() {
    local secret_name="jobseek/env-file-${ENVIRONMENT}"
    local fetch_region="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
    echo -e "${YELLOW}🔐 Downloading environment file from Secrets Manager (${secret_name})...${NC}"
    local target_dir
    target_dir=$(dirname "$ENV_FILE")
    if [[ ! -d "$target_dir" ]]; then
        mkdir -p "$target_dir"
    fi
    if aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --region "$fetch_region" \
        --query SecretString \
        --output text > "$ENV_FILE"; then
        ENV_FILE_ABS=$(python3 -c "import os,sys; print(os.path.abspath(sys.argv[1]))" "$ENV_FILE" 2>/dev/null || echo "$ENV_FILE")
        echo -e "${GREEN}✅ Environment file written to $ENV_FILE_ABS${NC}"
        return 0
    fi

    rm -f "$ENV_FILE" 2>/dev/null || true
    echo -e "${RED}❌ Failed to download environment file from Secrets Manager${NC}"
    return 1
}

if [[ "${CI:-}" == "true" ]]; then
    if ! fetch_env_from_secrets; then
        echo -e "${RED}❌ Unable to retrieve $ENV_FILE_NAME in CI${NC}"
        echo -e "${YELLOW}Ensure you've run: pnpm --filter @jobseek/cdk secrets:${ENVIRONMENT}${NC}"
        exit 1
    fi
elif [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${YELLOW}ℹ️  Environment file not found locally (${ENV_FILE_NAME}). Attempting to fetch from Secrets Manager...${NC}"
    if ! fetch_env_from_secrets; then
        echo -e "${RED}❌ Please create $ENV_FILE_NAME at $ENV_FILE_ABS and sync it with Secrets Manager${NC}"
        echo -e "${YELLOW}Run: pnpm --filter @jobseek/cdk secrets:${ENVIRONMENT}${NC}"
        echo -e "${YELLOW}Or fetch manually: aws secretsmanager get-secret-value --secret-id jobseek/env-file-${ENVIRONMENT} --region ${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}} --query SecretString --output text > $ENV_FILE_ABS${NC}"
        exit 1
    fi
fi

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    pnpm install
fi

# Step 1: Deploy secrets (unless skipped)
if [[ "$SKIP_SECRETS" != "true" ]]; then
    echo -e "${YELLOW}🔐 Deploying secrets to AWS Secrets Manager...${NC}"
    npx ts-node scripts/deploy-secrets.ts "$ENVIRONMENT"
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Failed to deploy secrets${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Secrets deployed successfully${NC}"
    echo ""
else
    echo -e "${YELLOW}⏩ Skipping secrets deployment${NC}"
    echo ""
fi

# Step 2: Bootstrap CDK if needed
echo -e "${YELLOW}🔧 Checking CDK bootstrap...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "$REGION" &> /dev/null; then
    echo -e "${YELLOW}Bootstrapping CDK for account $ACCOUNT_ID in region $REGION...${NC}"
    cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
else
    echo -e "${GREEN}✅ CDK already bootstrapped${NC}"
fi
echo ""

# Build the web client prior to deployment so assets are available
CLIENT_DIST_DIR="../dist"
CLIENT_DIST_INDEX="${CLIENT_DIST_DIR}/index.html"

if [[ "${SKIP_CLIENT_BUILD}" == "true" ]]; then
    echo -e "${YELLOW}⏩ Skipping client build (SKIP_CLIENT_BUILD=true)${NC}"
    if [[ ! -f "$CLIENT_DIST_INDEX" ]]; then
        echo -e "${RED}❌ Prebuilt client assets not found at $CLIENT_DIST_INDEX${NC}"
        echo -e "${YELLOW}Ensure the build artifact was downloaded or unset SKIP_CLIENT_BUILD${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}🛠️  Building web client bundle...${NC}"
    pnpm --dir .. build:deploy
fi
echo ""

# Step 3: Deploy CDK stacks
echo -e "${YELLOW}🏗️  Deploying CDK stacks...${NC}"

CONTEXT_FILE="cdk.context.$ENVIRONMENT.json"
if [[ ! -f "$CONTEXT_FILE" ]]; then
    echo -e "${RED}❌ Context file not found: $CONTEXT_FILE${NC}"
    echo "Run the secrets deployment first"
    exit 1
fi

# Show what will be deployed
echo -e "${YELLOW}📋 Deployment plan:${NC}"
cdk list --context-file "$CONTEXT_FILE" | while read stack; do
    echo "  - $stack"
done
echo ""

# Confirm for production
if [[ "$ENVIRONMENT" == "prod" ]]; then
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        echo -e "${YELLOW}⚠️  Running non-interactive production deployment${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: You are about to deploy to PRODUCTION${NC}"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            echo -e "${RED}❌ Deployment cancelled${NC}"
            exit 1
        fi
    fi
fi

# Deploy all stacks
echo -e "${YELLOW}Deploying all stacks...${NC}"
cdk deploy --all --context-file "$CONTEXT_FILE" $AUTO_APPROVE

if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ CDK deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All stacks deployed successfully${NC}"
echo ""

# Step 4: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
./scripts/verify-deployment.sh "$ENVIRONMENT"

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""

# Show useful outputs
WEB_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "JobseekWeb-$ENVIRONMENT" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [[ -n "$WEB_DOMAIN" && "$WEB_DOMAIN" != "None" ]]; then
    echo -e "${YELLOW}🌐 CloudFront domain:${NC} https://$WEB_DOMAIN"
fi

EDGE_FUNCTION_NAME=$(aws lambda list-functions \
    --region us-east-1 \
    --query "Functions[?starts_with(FunctionName,'JobseekWeb-$ENVIRONMENT')].FunctionName" \
    --output text 2>/dev/null | head -n1)

# Show next steps
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Open the CloudFront domain above and smoke-test the SPA"
echo "2. Update OAuth redirect URLs (Google/Twitter) to point at the CloudFront domain"
echo "3. Trigger a full auth + API flow and confirm Lambda logs look healthy"
echo "4. Share the new URL with the team once validated"
echo ""

# Show useful commands
echo -e "${YELLOW}🛠️  Useful Commands:${NC}"
echo "- Tail scheduler logs: aws logs tail /aws/lambda/jobseek-search-scheduler-$ENVIRONMENT --follow"
if [[ -n "$EDGE_FUNCTION_NAME" ]]; then
    echo "- Tail edge logs: aws logs tail /aws/lambda/$EDGE_FUNCTION_NAME --region us-east-1 --follow"
else
    echo "- Tail edge logs: aws logs tail /aws/lambda/<edge-function-name> --region us-east-1 --follow"
fi
echo "- Update secrets: ./deploy.sh $ENVIRONMENT"
echo "- Destroy stack: cdk destroy --all --context-file $CONTEXT_FILE"
