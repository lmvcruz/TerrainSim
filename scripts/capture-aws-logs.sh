#!/bin/bash
# Capture logs from AWS EC2 instance
# Usage: ./capture-aws-logs.sh [pm2|nginx-access|nginx-error|system|all]

set -e

# Configuration (override with .aws-logs.conf)
EC2_HOST="${EC2_HOST:-ec2-user@your-instance.compute.amazonaws.com}"
EC2_KEY="${EC2_KEY:-~/.ssh/terrainsim-ec2}"
PM2_APP_NAME="${PM2_APP_NAME:-simulation-api}"

# Load config if exists
if [ -f ".aws-logs.conf" ]; then
    source ".aws-logs.conf"
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

# Check if SSH key exists
if [ ! -f "$EC2_KEY" ]; then
    log_error "SSH key not found: $EC2_KEY"
    log_info "Create key: ssh-keygen -t rsa -b 4096 -f $EC2_KEY"
    exit 1
fi

# Test SSH connection
test_connection() {
    log_info "Testing SSH connection to $EC2_HOST..."
    if ssh -i "$EC2_KEY" -o ConnectTimeout=10 "$EC2_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
        log_info "✓ SSH connection successful"
        return 0
    else
        log_error "✗ SSH connection failed"
        log_info "Check: 1) EC2 instance is running 2) Security group allows SSH 3) Key is correct"
        exit 1
    fi
}

# Capture PM2 logs
capture_pm2() {
    log_info "Capturing PM2 logs for $PM2_APP_NAME..."
    ssh -i "$EC2_KEY" "$EC2_HOST" << 'EOF'
        echo "=== PM2 Status ==="
        pm2 status
        echo ""
        echo "=== PM2 Application Logs (last 200 lines) ==="
        pm2 logs --lines 200 --nostream
EOF
}

# Capture nginx access logs
capture_nginx_access() {
    log_info "Capturing nginx access logs..."
    ssh -i "$EC2_KEY" "$EC2_HOST" << 'EOF'
        echo "=== Nginx Access Logs (last 200 lines) ==="
        if [ -f /var/log/nginx/access.log ]; then
            sudo tail -n 200 /var/log/nginx/access.log
        else
            echo "Access log not found"
        fi
EOF
}

# Capture nginx error logs
capture_nginx_error() {
    log_info "Capturing nginx error logs..."
    ssh -i "$EC2_KEY" "$EC2_HOST" << 'EOF'
        echo "=== Nginx Error Logs (last 200 lines) ==="
        if [ -f /var/log/nginx/error.log ]; then
            sudo tail -n 200 /var/log/nginx/error.log
        else
            echo "Error log not found"
        fi
EOF
}

# Capture system logs
capture_system() {
    log_info "Capturing system logs..."
    ssh -i "$EC2_KEY" "$EC2_HOST" << 'EOF'
        echo "=== System Info ==="
        uname -a
        uptime
        echo ""
        echo "=== Disk Usage ==="
        df -h
        echo ""
        echo "=== Memory Usage ==="
        free -h
        echo ""
        echo "=== System Logs (last 100 lines) ==="
        sudo journalctl -n 100 --no-pager
EOF
}

# Show usage
usage() {
    echo "Usage: $0 [pm2|nginx-access|nginx-error|system|all]"
    echo ""
    echo "Examples:"
    echo "  $0 pm2              # Capture PM2 logs only"
    echo "  $0 nginx-access     # Capture nginx access logs"
    echo "  $0 all              # Capture all logs"
    echo "  $0 all > logs.txt   # Save to file"
    echo ""
    echo "Configuration:"
    echo "  Create .aws-logs.conf with:"
    echo "    EC2_HOST=ec2-user@your-instance.com"
    echo "    EC2_KEY=~/.ssh/terrainsim-ec2"
    echo "    PM2_APP_NAME=simulation-api"
    exit 1
}

# Main execution
LOG_TYPE="${1:-all}"

case "$LOG_TYPE" in
    pm2)
        test_connection
        capture_pm2
        ;;
    nginx-access)
        test_connection
        capture_nginx_access
        ;;
    nginx-error)
        test_connection
        capture_nginx_error
        ;;
    system)
        test_connection
        capture_system
        ;;
    all)
        test_connection
        log_info "==================================="
        log_info "AWS EC2 Log Capture"
        log_info "Timestamp: $(date)"
        log_info "==================================="
        echo ""
        capture_pm2
        echo ""
        echo "-----------------------------------"
        echo ""
        capture_nginx_access
        echo ""
        echo "-----------------------------------"
        echo ""
        capture_nginx_error
        echo ""
        echo "-----------------------------------"
        echo ""
        capture_system
        ;;
    *)
        log_error "Invalid log type: $LOG_TYPE"
        usage
        ;;
esac

log_info "✓ Log capture complete"
