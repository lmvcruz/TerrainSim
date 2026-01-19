#!/bin/bash
# Capture logs from Cloudflare Pages deployments
# Requires: Cloudflare API token
# Usage: ./capture-cloudflare-logs.sh [list|latest|deployment <deployment_id>]

set -e

# Configuration
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
CLOUDFLARE_PROJECT_NAME="${CLOUDFLARE_PROJECT_NAME:-terrainsim}"

# Load config if exists
if [ -f ".cloudflare-logs.conf" ]; then
    source ".cloudflare-logs.conf"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if API token is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    log_error "CLOUDFLARE_API_TOKEN not set"
    log_info "Set: export CLOUDFLARE_API_TOKEN=your_token"
    log_info "Or create .cloudflare-logs.conf with:"
    log_info "  CLOUDFLARE_API_TOKEN=your_token"
    log_info "  CLOUDFLARE_ACCOUNT_ID=your_account_id"
    log_info "  CLOUDFLARE_PROJECT_NAME=terrainsim"
    exit 1
fi

# Verify API token
verify_token() {
    log_info "Verifying Cloudflare API token..."

    RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

    if echo "$RESPONSE" | grep -q '"success":true'; then
        log_info "✓ API token verified"
        return 0
    else
        log_error "✗ API token verification failed"
        echo "$RESPONSE" | jq '.'
        exit 1
    fi
}

# Get account ID if not set
get_account_id() {
    if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
        log_info "Fetching account ID..."

        RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

        CLOUDFLARE_ACCOUNT_ID=$(echo "$RESPONSE" | jq -r '.result[0].id')

        if [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ "$CLOUDFLARE_ACCOUNT_ID" = "null" ]; then
            log_error "Could not fetch account ID"
            exit 1
        fi

        log_info "Account ID: $CLOUDFLARE_ACCOUNT_ID"
    fi
}

# List deployments
list_deployments() {
    log_info "Fetching deployments for project: $CLOUDFLARE_PROJECT_NAME"

    get_account_id

    RESPONSE=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$CLOUDFLARE_PROJECT_NAME/deployments" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo "$RESPONSE" | jq -r '.result[] | "\(.id) | \(.created_on) | \(.environment) | \(.deployment_trigger.metadata.commit_message // "N/A")"' | \
        while IFS='|' read -r id created env message; do
            echo "ID: $(echo $id | xargs)"
            echo "  Date: $(echo $created | xargs)"
            echo "  Environment: $(echo $env | xargs)"
            echo "  Message: $(echo $message | xargs)"
            echo ""
        done
    else
        log_error "Failed to fetch deployments"
        echo "$RESPONSE" | jq '.'
        exit 1
    fi
}

# Get latest deployment
get_latest() {
    log_info "Fetching latest deployment..."

    get_account_id

    RESPONSE=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$CLOUDFLARE_PROJECT_NAME/deployments?per_page=1" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        DEPLOYMENT_ID=$(echo "$RESPONSE" | jq -r '.result[0].id')
        log_info "Latest deployment ID: $DEPLOYMENT_ID"
        view_deployment "$DEPLOYMENT_ID"
    else
        log_error "Failed to fetch latest deployment"
        echo "$RESPONSE" | jq '.'
        exit 1
    fi
}

# View specific deployment
view_deployment() {
    local DEPLOYMENT_ID=$1

    if [ -z "$DEPLOYMENT_ID" ]; then
        log_error "Deployment ID required"
        exit 1
    fi

    get_account_id

    log_info "Fetching deployment: $DEPLOYMENT_ID"

    RESPONSE=$(curl -s -X GET \
        "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$CLOUDFLARE_PROJECT_NAME/deployments/$DEPLOYMENT_ID" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo "==================================="
        echo "Cloudflare Pages Deployment"
        echo "==================================="
        echo ""
        echo "ID: $(echo "$RESPONSE" | jq -r '.result.id')"
        echo "Environment: $(echo "$RESPONSE" | jq -r '.result.environment')"
        echo "Status: $(echo "$RESPONSE" | jq -r '.result.latest_stage.name')"
        echo "Created: $(echo "$RESPONSE" | jq -r '.result.created_on')"
        echo "URL: $(echo "$RESPONSE" | jq -r '.result.url')"
        echo ""

        # Get build log
        log_info "Fetching build log..."

        LOG_RESPONSE=$(curl -s -X GET \
            "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$CLOUDFLARE_PROJECT_NAME/deployments/$DEPLOYMENT_ID/history/logs" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

        if echo "$LOG_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            echo "==================================="
            echo "Build Log"
            echo "==================================="
            echo "$LOG_RESPONSE" | jq -r '.result.data[] | "\(.ts) | \(.line)"' | while IFS='|' read -r ts line; do
                echo "[$(echo $ts | xargs)] $(echo $line | xargs)"
            done
        else
            log_warn "Could not fetch build log"
        fi
    else
        log_error "Failed to fetch deployment"
        echo "$RESPONSE" | jq '.'
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [command] [args]"
    echo ""
    echo "Commands:"
    echo "  list                    List recent deployments"
    echo "  latest                  View latest deployment logs"
    echo "  deployment <id>         View specific deployment logs"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 latest"
    echo "  $0 deployment abc123def456"
    echo "  $0 latest > logs/cf-logs.txt"
    echo ""
    echo "Prerequisites:"
    echo "  - Cloudflare API token"
    echo "  - Set: export CLOUDFLARE_API_TOKEN=your_token"
    echo "  - Or create .cloudflare-logs.conf"
    exit 1
}

# Main execution
COMMAND="${1:-list}"

case "$COMMAND" in
    list)
        verify_token
        list_deployments
        ;;
    latest)
        verify_token
        get_latest
        ;;
    deployment)
        verify_token
        view_deployment "$2"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Invalid command: $COMMAND"
        usage
        ;;
esac
