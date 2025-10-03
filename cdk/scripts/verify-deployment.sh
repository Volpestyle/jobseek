#!/bin/bash
# Stream-safe deployment verification script for Jobseek
# This script verifies deployment without exposing sensitive information

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get environment from argument
ENVIRONMENT=${1:-dev}

echo "🔍 Verifying Jobseek deployment for environment: $ENVIRONMENT"
echo "=================================================="

# 1. Verify Secrets in Secrets Manager
echo -e "\n${YELLOW}1. Checking AWS Secrets Manager...${NC}"

# Check GitHub token
if aws secretsmanager describe-secret --secret-id jobseek/github-token &>/dev/null; then
    echo -e "${GREEN}✅ GitHub token exists${NC}"
    LAST_CHANGED=$(aws secretsmanager describe-secret \
        --secret-id jobseek/github-token \
        --query 'LastChangedDate' \
        --output text)
    echo "   Last updated: $LAST_CHANGED"
else
    echo -e "${RED}❌ GitHub token not found${NC}"
fi

# Check Wallcrawler API key
if aws secretsmanager describe-secret --secret-id jobseek/wallcrawler-api-key &>/dev/null; then
    echo -e "${GREEN}✅ Wallcrawler API key exists${NC}"
else
    echo -e "${YELLOW}ℹ️  Wallcrawler API key not configured (optional)${NC}"
fi

# 2. Verify Backend Stack
echo -e "\n${YELLOW}2. Checking Backend Stack...${NC}"

# Check DynamoDB table
TABLE_NAME="jobseek-users-${ENVIRONMENT}"
if aws dynamodb describe-table --table-name "$TABLE_NAME" &>/dev/null; then
    echo -e "${GREEN}✅ DynamoDB table exists: $TABLE_NAME${NC}"
    
    # Get table status (safe to show)
    STATUS=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --query 'Table.TableStatus' \
        --output text)
    echo "   Status: $STATUS"
    
    # Count GSIs (safe to show)
    GSI_COUNT=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --query 'length(Table.GlobalSecondaryIndexes)' \
        --output text)
    echo "   Global Secondary Indexes: $GSI_COUNT"
else
    echo -e "${RED}❌ DynamoDB table not found: $TABLE_NAME${NC}"
fi

# Check Lambda functions
echo -e "\n${YELLOW}3. Checking Lambda Functions...${NC}"
LAMBDA_PREFIX="JobseekBackend-${ENVIRONMENT}"
LAMBDA_COUNT=$(aws lambda list-functions \
    --query "length(Functions[?starts_with(FunctionName, '$LAMBDA_PREFIX')])" \
    --output text)

if [ "$LAMBDA_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $LAMBDA_COUNT Lambda function(s)${NC}"
    
    # List function names only (safe to show)
    aws lambda list-functions \
        --query "Functions[?starts_with(FunctionName, '$LAMBDA_PREFIX')].FunctionName" \
        --output text | tr '\t' '\n' | while read func; do
        echo "   - $func"
    done
else
    echo -e "${RED}❌ No Lambda functions found with prefix: $LAMBDA_PREFIX${NC}"
fi

echo -e "\n${YELLOW}4. Checking S3 Buckets...${NC}"
RESUME_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "JobseekBackend-${ENVIRONMENT}" \
    --query "Stacks[0].Outputs[?OutputKey=='ResumeBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")
WEB_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "JobseekWeb-${ENVIRONMENT}" \
    --query "Stacks[0].Outputs[?OutputKey=='WebBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -n "$RESUME_BUCKET" ]; then
    echo -e "${GREEN}✅ Resume bucket:${NC} $RESUME_BUCKET"
else
    echo -e "${RED}❌ Resume bucket output missing${NC}"
fi

if [ -n "$WEB_BUCKET" ] && [ "$WEB_BUCKET" != "None" ]; then
    echo -e "${GREEN}✅ Web assets bucket:${NC} $WEB_BUCKET"
else
    echo -e "${RED}❌ Web assets bucket output missing${NC}"
fi

# 5. Verify CloudFront distribution
echo -e "\n${YELLOW}5. Checking CloudFront Distribution...${NC}"
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "JobseekWeb-${ENVIRONMENT}" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
    --output text 2>/dev/null || echo "")
CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name "JobseekWeb-${ENVIRONMENT}" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_ID" ] && [ "$CLOUDFRONT_ID" != "None" ]; then
    echo -e "${GREEN}✅ CloudFront distribution:${NC} $CLOUDFRONT_ID"
    echo "   Domain: https://$CLOUDFRONT_DOMAIN"
else
    echo -e "${RED}❌ CloudFront distribution not found${NC}"
fi

# 6. Perform HTTP health check
if [ -n "$CLOUDFRONT_DOMAIN" ] && [ "$CLOUDFRONT_DOMAIN" != "None" ]; then
    echo -e "\n${YELLOW}6. Performing HTTP health check...${NC}"
    HEALTH_URL="https://${CLOUDFRONT_DOMAIN}/"
    HTTP_STATUS=$(curl -Ls -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 20 "$HEALTH_URL" || echo "000")

    if [[ "$HTTP_STATUS" =~ ^2 ]]; then
        echo -e "${GREEN}✅ Health check passed (HTTP ${HTTP_STATUS})${NC}"
    else
        echo -e "${RED}❌ Health check failed (HTTP ${HTTP_STATUS}) at $HEALTH_URL${NC}"
        exit 1
    fi
else
    echo -e "\n${YELLOW}6. Skipping health check (no CloudFront domain available)${NC}"
fi

# 7. Verify edge Lambda
echo -e "\n${YELLOW}7. Checking Lambda@Edge Function...${NC}"
EDGE_FUNCTIONS=$(aws lambda list-functions \
    --region us-east-1 \
    --query "Functions[?starts_with(FunctionName, 'JobseekWeb-${ENVIRONMENT}')].FunctionName" \
    --output text 2>/dev/null || echo "")

if [ -n "$EDGE_FUNCTIONS" ]; then
    echo -e "${GREEN}✅ Edge function(s) detected:${NC}"
    echo "$EDGE_FUNCTIONS" | tr '\t' '\n' | while read func; do
        echo "   - $func"
    done
else
    echo -e "${RED}❌ No edge functions found for JobseekWeb-${ENVIRONMENT}${NC}"
fi

# 8. Check CloudFormation stacks
echo -e "\n${YELLOW}8. Checking CloudFormation Stacks...${NC}"
STACKS=("JobseekBackend-${ENVIRONMENT}" "JobseekWeb-${ENVIRONMENT}" "JobseekMonitoring-${ENVIRONMENT}")

for STACK in "${STACKS[@]}"; do
    STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$STATUS" != "NOT_FOUND" ]; then
        if [ "$STATUS" == "CREATE_COMPLETE" ] || [ "$STATUS" == "UPDATE_COMPLETE" ]; then
            echo -e "${GREEN}✅ $STACK: $STATUS${NC}"
        else
            echo -e "${YELLOW}⚠️  $STACK: $STATUS${NC}"
        fi
    else
        if [[ "$STACK" == *"Monitoring"* ]]; then
            echo -e "${YELLOW}ℹ️  $STACK: Not deployed (optional)${NC}"
        else
            echo -e "${RED}❌ $STACK: Not found${NC}"
        fi
    fi
done

# 8. Summary
echo -e "\n${YELLOW}=================================================="
echo -e "Verification Complete for Environment: $ENVIRONMENT"
echo -e "==================================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Hit the CloudFront domain and walk through auth + API calls"
echo "2. Confirm OAuth redirect URIs include the CloudFront domain"
echo "3. Review Lambda and CloudFront error metrics in CloudWatch"
echo "4. Share the deployment URL with your stakeholders"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo "- View scheduler logs: aws logs tail /aws/lambda/jobseek-search-scheduler-${ENVIRONMENT} --follow"
if [ -n "$EDGE_FUNCTIONS" ]; then
    EDGE_EXAMPLE=$(echo "$EDGE_FUNCTIONS" | tr '\t' '\n' | head -n1)
    echo "- View edge logs: aws logs tail /aws/lambda/$EDGE_EXAMPLE --region us-east-1 --follow"
else
    echo "- View edge logs: aws logs tail /aws/lambda/<edge-function-name> --region us-east-1 --follow"
fi
echo "- Monitor costs: aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --metrics 'UnblendedCost'"
