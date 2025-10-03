#!/bin/bash
# Jobseek Stack Cleanup Script
# Safely removes failed or unwanted CDK stacks

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
FORCE=${2:-false}
STACK_NAME=${3:-""}

# Show usage
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: ./cleanup.sh [environment] [options] [stack-name]"
    echo ""
    echo "Environments:"
    echo "  dev         Development environment (default)"
    echo "  staging     Staging environment"
    echo "  prod        Production environment (requires confirmation)"
    echo ""
    echo "Options:"
    echo "  --force     Skip confirmation prompts"
    echo "  --help, -h  Show this help message"
    echo ""
    echo "Stack names (optional):"
    echo "  backend     Clean only backend stack"
    echo "  web         Clean only web stack"
    echo "  monitoring  Clean only monitoring stack"
    echo "  all         Clean all stacks (default)"
    echo ""
    echo "Examples:"
    echo "  ./cleanup.sh                    # Clean all dev stacks"
    echo "  ./cleanup.sh dev amplify        # Clean only dev amplify stack"
    echo "  ./cleanup.sh staging --force    # Force clean all staging stacks"
    exit 0
fi

# Parse arguments
for arg in "$@"; do
    case $arg in
        --force)
            FORCE=true
            ;;
        backend|web|monitoring)
            STACK_NAME=$arg
            ;;
        all)
            STACK_NAME=""
            ;;
    esac
done

echo -e "${BLUE}🧹 Jobseek Stack Cleanup${NC}"
echo -e "${BLUE}========================${NC}"
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo ""

# Function to check stack status
check_stack_status() {
    local stack=$1
    aws cloudformation describe-stacks \
        --stack-name "$stack" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND"
}

# Function to delete stack
delete_stack() {
    local stack=$1
    local status=$(check_stack_status "$stack")
    
    if [[ "$status" == "NOT_FOUND" ]]; then
        echo -e "${YELLOW}ℹ️  Stack $stack does not exist${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Stack $stack status: $status${NC}"
    
    # Check if stack is in a deletable state
    if [[ "$status" == "DELETE_IN_PROGRESS" ]]; then
        echo -e "${YELLOW}⏳ Stack $stack is already being deleted${NC}"
        return 0
    fi
    
    if [[ "$status" == "CREATE_IN_PROGRESS" || "$status" == "UPDATE_IN_PROGRESS" ]]; then
        echo -e "${RED}❌ Cannot delete $stack - operation in progress${NC}"
        echo "Wait for the operation to complete or fail, then retry"
        return 1
    fi
    
    # Confirm deletion (unless forced)
    if [[ "$FORCE" != "true" ]]; then
        echo -e "${YELLOW}⚠️  About to delete stack: $stack${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            echo -e "${YELLOW}Skipping $stack${NC}"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}🗑️  Deleting stack $stack...${NC}"
    
    # Delete the CloudFormation stack
    aws cloudformation delete-stack --stack-name "$stack"
    
    echo -e "${GREEN}✅ Deletion initiated for $stack${NC}"
    
    # Wait for deletion to complete (optional)
    echo -e "${YELLOW}Waiting for deletion to complete...${NC}"
    aws cloudformation wait stack-delete-complete --stack-name "$stack" 2>/dev/null || true
    
    # Verify deletion
    local final_status=$(check_stack_status "$stack")
    if [[ "$final_status" == "NOT_FOUND" ]]; then
        echo -e "${GREEN}✅ Stack $stack successfully deleted${NC}"
    else
        echo -e "${RED}❌ Stack $stack deletion may have failed (status: $final_status)${NC}"
    fi
}

# Production safety check
if [[ "$ENVIRONMENT" == "prod" && "$FORCE" != "true" ]]; then
    echo -e "${RED}⚠️  WARNING: You are about to delete PRODUCTION stacks!${NC}"
    echo -e "${RED}This action cannot be undone and may cause service disruption.${NC}"
    read -p "Type 'delete production' to confirm: " confirm
    if [[ "$confirm" != "delete production" ]]; then
        echo -e "${RED}❌ Cleanup cancelled${NC}"
        exit 1
    fi
fi

# Determine which stacks to clean
STACKS=()
case "$STACK_NAME" in
    "backend")
        STACKS=("JobseekBackend-$ENVIRONMENT")
        ;;
    "web")
        STACKS=("JobseekWeb-$ENVIRONMENT")
        ;;
    "monitoring")
        STACKS=("JobseekMonitoring-$ENVIRONMENT")
        ;;
    *)
        # Default: all stacks (in reverse dependency order)
        STACKS=(
            "JobseekMonitoring-$ENVIRONMENT"
            "JobseekWeb-$ENVIRONMENT"
            "JobseekBackend-$ENVIRONMENT"
        )
        ;;
esac

echo -e "${YELLOW}📋 Stacks to clean:${NC}"
for stack in "${STACKS[@]}"; do
    echo "  - $stack"
done
echo ""

# Delete stacks
FAILED=false
for stack in "${STACKS[@]}"; do
    if ! delete_stack "$stack"; then
        FAILED=true
    fi
    echo ""
done

# Clean up context files
if [[ "$STACK_NAME" == "" || "$STACK_NAME" == "all" ]]; then
    echo -e "${YELLOW}🧹 Cleaning up context files...${NC}"
    CONTEXT_FILE="cdk.context.$ENVIRONMENT.json"
    if [[ -f "$CONTEXT_FILE" ]]; then
        if [[ "$FORCE" == "true" ]]; then
            rm -f "$CONTEXT_FILE"
            echo -e "${GREEN}✅ Removed $CONTEXT_FILE${NC}"
        else
            read -p "Remove $CONTEXT_FILE? (yes/no): " confirm
            if [[ "$confirm" == "yes" ]]; then
                rm -f "$CONTEXT_FILE"
                echo -e "${GREEN}✅ Removed $CONTEXT_FILE${NC}"
            fi
        fi
    fi
fi

# Summary
echo ""
if [[ "$FAILED" == "true" ]]; then
    echo -e "${RED}⚠️  Some stacks could not be deleted${NC}"
    echo "Check the AWS CloudFormation console for more details"
    exit 1
else
    echo -e "${GREEN}🎉 Cleanup complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Fix any configuration issues"
    echo "2. Run 'pnpm deploy:$ENVIRONMENT' to redeploy"
fi

# Show any remaining stacks
echo ""
echo -e "${YELLOW}📊 Remaining stacks for environment $ENVIRONMENT:${NC}"
aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE CREATE_FAILED UPDATE_FAILED \
    --query "StackSummaries[?contains(StackName, 'Jobseek') && contains(StackName, '$ENVIRONMENT')].{Name:StackName,Status:StackStatus}" \
    --output table 2>/dev/null || echo "No stacks found"
