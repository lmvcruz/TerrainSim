#!/bin/bash
# Capture logs from GitHub Actions workflows
# Requires: GitHub CLI (gh) - https://cli.github.com/
# Usage: ./capture-gh-logs.sh [list|latest|run <run_id>|job <job_name>|download <run_id> <output>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) not found"
    log_info "Install: winget install GitHub.cli  (Windows)"
    log_info "Install: brew install gh            (macOS)"
    log_info "Or visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI"
    log_info "Run: gh auth login"
    exit 1
fi

# List recent workflow runs
list_runs() {
    log_info "Recent workflow runs:"
    gh run list --limit 20
}

# Get latest workflow run
get_latest() {
    log_info "Fetching latest workflow run..."
    RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')

    if [ -z "$RUN_ID" ]; then
        log_error "No workflow runs found"
        exit 1
    fi

    log_info "Latest run ID: $RUN_ID"
    view_run "$RUN_ID"
}

# View specific workflow run
view_run() {
    local RUN_ID=$1

    if [ -z "$RUN_ID" ]; then
        log_error "Run ID required"
        exit 1
    fi

    log_info "Fetching workflow run: $RUN_ID"

    # Get run details
    gh run view "$RUN_ID"

    echo ""
    echo "==================================="
    echo "Workflow Run Logs"
    echo "==================================="

    # Get logs
    gh run view "$RUN_ID" --log
}

# View specific job logs
view_job() {
    local JOB_NAME=$1

    if [ -z "$JOB_NAME" ]; then
        log_error "Job name required"
        exit 1
    fi

    log_info "Fetching logs for job: $JOB_NAME"

    # Get latest run with this job
    gh run list --limit 1 --json databaseId --jq '.[0].databaseId' | while read RUN_ID; do
        log_info "Run ID: $RUN_ID"
        gh run view "$RUN_ID" --log | grep -A 1000 "$JOB_NAME"
    done
}

# Download workflow logs
download_logs() {
    local RUN_ID=$1
    local OUTPUT=$2

    if [ -z "$RUN_ID" ] || [ -z "$OUTPUT" ]; then
        log_error "Usage: download <run_id> <output_file>"
        exit 1
    fi

    log_info "Downloading logs for run: $RUN_ID"
    log_info "Output: $OUTPUT"

    # Create output directory if needed
    mkdir -p "$(dirname "$OUTPUT")"

    # Download logs
    gh run view "$RUN_ID" --log > "$OUTPUT"

    log_info "✓ Logs downloaded to: $OUTPUT"
}

# Watch workflow run (live updates)
watch_run() {
    local RUN_ID=$1

    if [ -z "$RUN_ID" ]; then
        # Get latest run
        RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
    fi

    log_info "Watching workflow run: $RUN_ID"
    gh run watch "$RUN_ID"
}

# Show usage
usage() {
    echo "Usage: $0 [command] [args]"
    echo ""
    echo "Commands:"
    echo "  list                        List recent workflow runs"
    echo "  latest                      View latest workflow run logs"
    echo "  run <run_id>                View specific workflow run logs"
    echo "  job <job_name>              View specific job logs"
    echo "  download <run_id> <output>  Download logs to file"
    echo "  watch [run_id]              Watch workflow run (live updates)"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 latest"
    echo "  $0 run 1234567890"
    echo "  $0 job test-backend"
    echo "  $0 download 1234567890 logs/gh-logs.txt"
    echo "  $0 watch"
    echo ""
    echo "Prerequisites:"
    echo "  - GitHub CLI installed: gh --version"
    echo "  - Authenticated: gh auth status"
    exit 1
}

# Main execution
COMMAND="${1:-list}"

case "$COMMAND" in
    list)
        list_runs
        ;;
    latest)
        get_latest
        ;;
    run)
        view_run "$2"
        ;;
    job)
        view_job "$2"
        ;;
    download)
        download_logs "$2" "$3"
        ;;
    watch)
        watch_run "$2"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Invalid command: $COMMAND"
        usage
        ;;
esac
