#!/usr/bin/env python3
"""
Production Testing Script for Phase 3.2
Tests all logging infrastructure components in production environment
"""

import sys
import subprocess
import requests
import json
from pathlib import Path
from datetime import datetime

# Configuration
PRODUCTION_API = "https://api.lmvcruz.work"
PRODUCTION_SSH = "ubuntu@54.242.131.12"
SSH_KEY = r"C:\Users\l-cruz\.ssh\terrainsim-key.pem"
TEST_RESULTS = []

# ANSI color codes
class Colors:
    RESET = '\033[0m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'

def print_header(message):
    """Print test section header"""
    print(f"\n{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.CYAN}  {message}{Colors.RESET}")
    print(f"{Colors.CYAN}{'=' * 70}{Colors.RESET}")

def add_test_result(name, status, details=""):
    """Record test result"""
    TEST_RESULTS.append({
        "test": name,
        "status": status,
        "details": details
    })
    
    if status == "PASS":
        print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
    elif status == "FAIL":
        print(f"{Colors.RED}✗{Colors.RESET} {name}")
        if details:
            print(f"  {Colors.YELLOW}{details}{Colors.RESET}")
    elif status == "SKIP":
        print(f"{Colors.YELLOW}⊘{Colors.RESET} {name} (skipped)")

def run_ssh_command(command):
    """Execute SSH command on production server"""
    try:
        result = subprocess.run(
            ['ssh', '-i', SSH_KEY, '-o', 'StrictHostKeyChecking=no', PRODUCTION_SSH, command],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Command timed out", 1
    except Exception as e:
        return "", str(e), 1

def test_backend_health():
    """Test 1: Backend health check"""
    print_header("Test 1: Backend Health Check")
    
    try:
        response = requests.get(f"{PRODUCTION_API}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            add_test_result("Backend health check", "PASS", f"Status: {data.get('status', 'unknown')}")
            return True
        else:
            add_test_result("Backend health check", "FAIL", f"HTTP {response.status_code}")
            return False
    except Exception as e:
        add_test_result("Backend health check", "FAIL", str(e))
        return False

def test_admin_log_level_get():
    """Test 2: GET /admin/log-level"""
    print_header("Test 2: GET /admin/log-level")
    
    try:
        response = requests.get(f"{PRODUCTION_API}/admin/log-level", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_level = data.get('logLevel', 'unknown')
            add_test_result("GET /admin/log-level", "PASS", f"Current level: {log_level}")
            return True
        else:
            add_test_result("GET /admin/log-level", "FAIL", f"HTTP {response.status_code}")
            return False
    except Exception as e:
        add_test_result("GET /admin/log-level", "FAIL", str(e))
        return False

def test_admin_log_level_post():
    """Test 3: POST /admin/log-level (dynamic change)"""
    print_header("Test 3: POST /admin/log-level (Dynamic Change)")
    
    try:
        # Change to debug
        response = requests.post(
            f"{PRODUCTION_API}/admin/log-level",
            json={"level": "debug"},
            timeout=10
        )
        if response.status_code != 200:
            add_test_result("POST /admin/log-level (set debug)", "FAIL", f"HTTP {response.status_code}")
            return False
        
        # Verify change
        response = requests.get(f"{PRODUCTION_API}/admin/log-level", timeout=10)
        if response.status_code == 200 and response.json().get('logLevel') == 'debug':
            add_test_result("POST /admin/log-level (set debug)", "PASS")
        else:
            add_test_result("POST /admin/log-level (set debug)", "FAIL", "Level not changed")
            return False
        
        # Change back to info
        response = requests.post(
            f"{PRODUCTION_API}/admin/log-level",
            json={"level": "info"},
            timeout=10
        )
        if response.status_code == 200:
            add_test_result("POST /admin/log-level (reset to info)", "PASS")
            return True
        else:
            add_test_result("POST /admin/log-level (reset to info)", "FAIL")
            return False
            
    except Exception as e:
        add_test_result("POST /admin/log-level", "FAIL", str(e))
        return False

def test_logs_stats():
    """Test 4: GET /api/logs/stats"""
    print_header("Test 4: GET /api/logs/stats")
    
    try:
        response = requests.get(f"{PRODUCTION_API}/api/logs/stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            total_files = data.get('totalFiles', 0)
            total_size = data.get('totalSize', 0)
            add_test_result("GET /api/logs/stats", "PASS", f"{total_files} files, {total_size} bytes")
            return True
        else:
            add_test_result("GET /api/logs/stats", "FAIL", f"HTTP {response.status_code}")
            return False
    except Exception as e:
        add_test_result("GET /api/logs/stats", "FAIL", str(e))
        return False

def test_logs_filter():
    """Test 5: GET /api/logs/filter"""
    print_header("Test 5: GET /api/logs/filter")
    
    try:
        # Test filter by level
        response = requests.get(
            f"{PRODUCTION_API}/api/logs/filter",
            params={"level": "info", "limit": 10},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            add_test_result("GET /api/logs/filter (level=info)", "PASS", f"{count} entries found")
            return True
        else:
            add_test_result("GET /api/logs/filter", "FAIL", f"HTTP {response.status_code}")
            return False
    except Exception as e:
        add_test_result("GET /api/logs/filter", "FAIL", str(e))
        return False

def test_frontend_logging():
    """Test 6: POST /api/logs/frontend"""
    print_header("Test 6: POST /api/logs/frontend (Frontend Log Ingestion)")
    
    try:
        test_log = {
            "level": "info",
            "message": "Test log from production test script",
            "context": {
                "test": True,
                "timestamp": datetime.now().isoformat(),
                "source": "test-production.py"
            }
        }
        
        response = requests.post(
            f"{PRODUCTION_API}/api/logs/frontend",
            json=test_log,
            timeout=10
        )
        
        if response.status_code == 200:
            add_test_result("POST /api/logs/frontend", "PASS", "Test log accepted")
            return True
        else:
            add_test_result("POST /api/logs/frontend", "FAIL", f"HTTP {response.status_code}")
            return False
    except Exception as e:
        add_test_result("POST /api/logs/frontend", "FAIL", str(e))
        return False

def test_ssh_access(skip_ssh=False):
    """Test 7: SSH access to production"""
    print_header("Test 7: SSH Access to Production")
    
    if skip_ssh:
        add_test_result("SSH access", "SKIP")
        return True
    
    stdout, stderr, code = run_ssh_command("echo 'SSH test successful'")
    
    if code == 0 and "SSH test successful" in stdout:
        add_test_result("SSH access", "PASS")
        return True
    else:
        add_test_result("SSH access", "FAIL", stderr or "Connection failed")
        return False

def test_log_directory(skip_ssh=False):
    """Test 8: Log directory exists on production"""
    print_header("Test 8: Log Directory Verification")
    
    if skip_ssh:
        add_test_result("Log directory check", "SKIP")
        return True
    
    stdout, stderr, code = run_ssh_command("ls -lhd /var/log/terrainsim")
    
    if code == 0:
        add_test_result("Log directory check", "PASS", stdout.strip())
        return True
    else:
        add_test_result("Log directory check", "FAIL", "Directory not found")
        return False

def test_log_files(skip_ssh=False):
    """Test 9: Log files exist"""
    print_header("Test 9: Log Files Verification")
    
    if skip_ssh:
        add_test_result("Log files check", "SKIP")
        return True
    
    stdout, stderr, code = run_ssh_command("ls -lh /var/log/terrainsim/*.log 2>/dev/null | wc -l")
    
    if code == 0:
        file_count = int(stdout.strip() or 0)
        if file_count > 0:
            add_test_result("Log files check", "PASS", f"{file_count} log file(s) found")
            return True
        else:
            add_test_result("Log files check", "FAIL", "No log files found")
            return False
    else:
        add_test_result("Log files check", "FAIL", "Could not check log files")
        return False

def test_env_configuration(skip_ssh=False):
    """Test 10: Environment configuration"""
    print_header("Test 10: Environment Configuration")
    
    if skip_ssh:
        add_test_result("Environment config check", "SKIP")
        return True
    
    stdout, stderr, code = run_ssh_command(
        "cd /var/www/terrainsim && grep -E 'LOG_LEVEL|LOG_DIR|ENABLE' .env"
    )
    
    if code == 0:
        required_vars = ['LOG_LEVEL', 'LOG_DIR', 'ENABLE_FILE_LOGGING']
        found_vars = [var for var in required_vars if var in stdout]
        
        if len(found_vars) == len(required_vars):
            add_test_result("Environment config check", "PASS", f"All {len(required_vars)} required vars found")
            return True
        else:
            missing = set(required_vars) - set(found_vars)
            add_test_result("Environment config check", "FAIL", f"Missing: {', '.join(missing)}")
            return False
    else:
        add_test_result("Environment config check", "FAIL", "Could not read .env file")
        return False

def test_python_log_manager():
    """Test 11: Python log-manager.py status"""
    print_header("Test 11: Python Log Manager Script")
    
    if not Path("scripts/log-manager.py").exists():
        add_test_result("Python log-manager.py", "FAIL", "Script not found")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, "scripts/log-manager.py", "status"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            add_test_result("Python log-manager.py status", "PASS")
            return True
        else:
            add_test_result("Python log-manager.py status", "FAIL", result.stderr[:100])
            return False
    except Exception as e:
        add_test_result("Python log-manager.py", "FAIL", str(e))
        return False

def print_summary():
    """Print test results summary"""
    print_header("Test Results Summary")
    
    passed = sum(1 for r in TEST_RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in TEST_RESULTS if r["status"] == "FAIL")
    skipped = sum(1 for r in TEST_RESULTS if r["status"] == "SKIP")
    total = len(TEST_RESULTS)
    
    print(f"\n{Colors.CYAN}{'Test':<50} {'Status':<10}{Colors.RESET}")
    print(f"{Colors.CYAN}{'-' * 60}{Colors.RESET}")
    
    for result in TEST_RESULTS:
        status_color = Colors.GREEN if result["status"] == "PASS" else Colors.RED if result["status"] == "FAIL" else Colors.YELLOW
        print(f"{result['test']:<50} {status_color}{result['status']:<10}{Colors.RESET}")
    
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.WHITE}Total: {total}  {Colors.GREEN}Passed: {passed}  {Colors.RED}Failed: {failed}  {Colors.YELLOW}Skipped: {skipped}{Colors.RESET}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.RESET}\n")
    
    if failed == 0:
        print(f"{Colors.GREEN}🎉 All critical tests passed!{Colors.RESET}")
        print(f"\n{Colors.CYAN}Next Steps:{Colors.RESET}")
        print(f"{Colors.WHITE}  1. Generate user activity on frontend (https://terrainsim.pages.dev){Colors.RESET}")
        print(f"{Colors.WHITE}  2. Test Python log capture: python scripts/log-manager.py capture-execution-backend production{Colors.RESET}")
        print(f"{Colors.WHITE}  3. Test log filtering: python scripts/filter-logs.py production level error{Colors.RESET}")
        print(f"{Colors.WHITE}  4. Review production logs via SSH{Colors.RESET}")
        print(f"{Colors.WHITE}  5. Update LOGGING-INFRASTRUCTURE-PLAN.md with Phase 3.2 complete{Colors.RESET}")
    else:
        print(f"{Colors.YELLOW}⚠️ Some tests failed. Review errors above and troubleshoot.{Colors.RESET}")
        print(f"\n{Colors.CYAN}Common fixes:{Colors.RESET}")
        print(f"{Colors.WHITE}  - Verify backend is deployed with Winston logging{Colors.RESET}")
        print(f"{Colors.WHITE}  - Check .env.production settings{Colors.RESET}")
        print(f"{Colors.WHITE}  - Verify log directory exists: /var/log/terrainsim/{Colors.RESET}")
        print(f"{Colors.WHITE}  - Check PM2 logs: ssh -i {SSH_KEY} {PRODUCTION_SSH} 'pm2 logs terrainsim-api'{Colors.RESET}")
    
    print()
    return failed == 0

def main():
    """Main test execution"""
    skip_ssh = "--skip-ssh" in sys.argv
    
    print(f"{Colors.CYAN}")
    print("=" * 70)
    print("  TerrainSim Production Testing Suite (Phase 3.2)")
    print("=" * 70)
    print(f"{Colors.RESET}\n")
    print(f"{Colors.WHITE}Production API: {PRODUCTION_API}{Colors.RESET}")
    print(f"{Colors.WHITE}Production SSH: {PRODUCTION_SSH}{Colors.RESET}")
    if skip_ssh:
        print(f"{Colors.YELLOW}SSH tests will be skipped{Colors.RESET}")
    
    # Run all tests
    test_backend_health()
    test_admin_log_level_get()
    test_admin_log_level_post()
    test_logs_stats()
    test_logs_filter()
    test_frontend_logging()
    test_ssh_access(skip_ssh)
    test_log_directory(skip_ssh)
    test_log_files(skip_ssh)
    test_env_configuration(skip_ssh)
    test_python_log_manager()
    
    # Print summary and return exit code
    success = print_summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
