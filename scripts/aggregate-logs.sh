#!/bin/bash
# Aggregate logs from all deployment platforms into unified format
# Combines AWS EC2, GitHub Actions, and Cloudflare Pages logs
# Usage: ./aggregate-logs.sh [--from DATETIME] [--to DATETIME] [--level LEVEL] [--source SOURCE]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEMP_DIR="./temp-logs"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-json}"  # json or text
TIME_FROM=""
TIME_TO=""
LEVEL_FILTER=""
SOURCE_FILTER=""

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --from)
            TIME_FROM="$2"
            shift 2
            ;;
        --to)
            TIME_TO="$2"
            shift 2
            ;;
        --level)
            LEVEL_FILTER="$2"
            shift 2
            ;;
        --source)
            SOURCE_FILTER="$2"
            shift 2
            ;;
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --from DATETIME    Filter logs from this time (ISO 8601)"
    echo "  --to DATETIME      Filter logs to this time (ISO 8601)"
    echo "  --level LEVEL      Filter by log level (debug|info|warn|error)"
    echo "  --source SOURCE    Filter by source (aws|github|cloudflare)"
    echo "  --format FORMAT    Output format (json|text), default: json"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --level error"
    echo "  $0 --source aws --level warn"
    echo "  $0 --from '2026-01-19 00:00' --to '2026-01-19 23:59'"
    echo "  $0 --format text > logs.txt"
    exit 1
}

# Create temp directory
mkdir -p "$TEMP_DIR"

# Normalize AWS logs to JSON
normalize_aws_logs() {
    local AWS_LOG="$TEMP_DIR/aws-raw.log"

    log_info "Capturing AWS logs..."

    if [ -f "./scripts/capture-aws-logs.sh" ]; then
        ./scripts/capture-aws-logs.sh all > "$AWS_LOG" 2>&1 || true
    else
        log_error "AWS log capture script not found"
        return 1
    fi

    # Parse AWS logs (simplified - assumes PM2 JSON logs)
    if [ -f "$AWS_LOG" ]; then
        # Extract JSON log lines and add source
        grep -E '^\{.*\}$' "$AWS_LOG" | while read line; do
            echo "$line" | jq -c '. + {source: "aws-pm2"}'
        done

        # Extract nginx logs (simplified)
        grep -E '^\[.*\]' "$AWS_LOG" | while read line; do
            timestamp=$(echo "$line" | grep -oP '\[\K[^\]]+')
            message=$(echo "$line" | sed 's/\[.*\] //')
            level="info"

            if echo "$message" | grep -qi "error"; then
                level="error"
            elif echo "$message" | grep -qi "warn"; then
                level="warn"
            fi

            jq -n -c \
                --arg ts "$timestamp" \
                --arg level "$level" \
                --arg msg "$message" \
                --arg src "aws-nginx" \
                '{timestamp: $ts, level: $level, message: $msg, source: $src}'
        done
    fi
}

# Normalize GitHub Actions logs to JSON
normalize_github_logs() {
    local GH_LOG="$TEMP_DIR/gh-raw.log"

    log_info "Capturing GitHub Actions logs..."

    if [ -f "./scripts/capture-gh-logs.sh" ]; then
        ./scripts/capture-gh-logs.sh latest > "$GH_LOG" 2>&1 || true
    else
        log_error "GitHub log capture script not found"
        return 1
    fi

    # Parse GitHub Actions logs
    if [ -f "$GH_LOG" ]; then
        # Extract timestamp and message from GitHub Actions format
        grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' "$GH_LOG" | while read line; do
            timestamp=$(echo "$line" | grep -oP '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+Z')
            message=$(echo "$line" | sed 's/^[0-9T:.Z-]* //')
            level="info"

            if echo "$message" | grep -qi "error"; then
                level="error"
            elif echo "$message" | grep -qi "warning\|warn"; then
                level="warn"
            fi

            jq -n -c \
                --arg ts "$timestamp" \
                --arg level "$level" \
                --arg msg "$message" \
                --arg src "github-actions" \
                '{timestamp: $ts, level: $level, message: $msg, source: $src}'
        done
    fi
}

# Normalize Cloudflare logs to JSON
normalize_cloudflare_logs() {
    local CF_LOG="$TEMP_DIR/cf-raw.log"

    log_info "Capturing Cloudflare Pages logs..."

    if [ -f "./scripts/capture-cloudflare-logs.sh" ]; then
        ./scripts/capture-cloudflare-logs.sh latest > "$CF_LOG" 2>&1 || true
    else
        log_error "Cloudflare log capture script not found"
        return 1
    fi

    # Parse Cloudflare Pages logs
    if [ -f "$CF_LOG" ]; then
        # Extract timestamp and message
        grep -E '^\[' "$CF_LOG" | while read line; do
            timestamp=$(echo "$line" | grep -oP '\[\K[^\]]+')
            message=$(echo "$line" | sed 's/^\[.*\] //')
            level="info"

            if echo "$message" | grep -qi "error\|failed"; then
                level="error"
            elif echo "$message" | grep -qi "warning\|warn"; then
                level="warn"
            fi

            jq -n -c \
                --arg ts "$timestamp" \
                --arg level "$level" \
                --arg msg "$message" \
                --arg src "cloudflare-pages" \
                '{timestamp: $ts, level: $level, message: $msg, source: $src}'
        done
    fi
}

# Aggregate all logs
aggregate_logs() {
    local ALL_LOGS="$TEMP_DIR/all-logs.jsonl"

    # Combine all normalized logs
    cat "$TEMP_DIR"/*.jsonl 2>/dev/null > "$ALL_LOGS" || true

    if [ ! -s "$ALL_LOGS" ]; then
        log_error "No logs collected"
        return 1
    fi

    # Apply filters
    local FILTERED="$ALL_LOGS"

    if [ -n "$TIME_FROM" ]; then
        log_info "Filtering from: $TIME_FROM"
        FILTERED="$TEMP_DIR/filtered.jsonl"
        jq -c "select(.timestamp >= \"$TIME_FROM\")" "$ALL_LOGS" > "$FILTERED"
    fi

    if [ -n "$TIME_TO" ]; then
        log_info "Filtering to: $TIME_TO"
        local TEMP="$TEMP_DIR/temp.jsonl"
        jq -c "select(.timestamp <= \"$TIME_TO\")" "$FILTERED" > "$TEMP"
        mv "$TEMP" "$FILTERED"
    fi

    if [ -n "$LEVEL_FILTER" ]; then
        log_info "Filtering level: $LEVEL_FILTER"
        local TEMP="$TEMP_DIR/temp.jsonl"
        jq -c "select(.level == \"$LEVEL_FILTER\")" "$FILTERED" > "$TEMP"
        mv "$TEMP" "$FILTERED"
    fi

    if [ -n "$SOURCE_FILTER" ]; then
        log_info "Filtering source: $SOURCE_FILTER"
        local TEMP="$TEMP_DIR/temp.jsonl"
        jq -c "select(.source | startswith(\"$SOURCE_FILTER\"))" "$FILTERED" > "$TEMP"
        mv "$TEMP" "$FILTERED"
    fi

    # Sort by timestamp
    log_info "Sorting logs by timestamp..."
    sort -t'"' -k4 "$FILTERED"
}

# Format output
format_output() {
    if [ "$OUTPUT_FORMAT" = "text" ]; then
        # Human-readable text format
        while read line; do
            timestamp=$(echo "$line" | jq -r '.timestamp')
            level=$(echo "$line" | jq -r '.level')
            source=$(echo "$line" | jq -r '.source')
            message=$(echo "$line" | jq -r '.message')

            printf "[%s] %-5s [%-20s] %s\n" "$timestamp" "$level" "$source" "$message"
        done
    else
        # JSON format (default)
        cat
    fi
}

# Main execution
log_info "==================================="
log_info "Log Aggregation"
log_info "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log_info "==================================="

# Capture and normalize logs from all sources
normalize_aws_logs > "$TEMP_DIR/aws.jsonl" 2>/dev/null || log_error "AWS logs failed"
normalize_github_logs > "$TEMP_DIR/github.jsonl" 2>/dev/null || log_error "GitHub logs failed"
normalize_cloudflare_logs > "$TEMP_DIR/cloudflare.jsonl" 2>/dev/null || log_error "Cloudflare logs failed"

# Aggregate, filter, and output
log_info "Aggregating logs..."
aggregate_logs | format_output

# Cleanup
rm -rf "$TEMP_DIR"

log_info "✓ Aggregation complete"
