#!/usr/bin/env python3
"""
Production Testing Suite (SSH-based) for TerrainSim Winston Logging Infrastructure

This test script validates the Winston logging deployment by testing endpoints
directly on the production server via SSH, bypassing any external DNS/proxy issues.
"""

import subprocess
import json
import sys

# Configuration
SSH_KEY = r"C:\Users\l-cruz\.ssh\terrainsim-key.pem"
SERVER = "ubuntu@54.242.131.12"
API_URL = "http://localhost:3001"

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def run_ssh_command(command):
    """Execute a command on the remote server via SSH"""
    try:
        result = subprocess.run(
            ['ssh', '-i', SSH_KEY, SERVER, command],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return '', 'Timeout', 1
    except Exception as e:
        return '', str(e), 1

def curl_json(endpoint):
    """Make a curl request and parse JSON response"""
    stdout, stderr, code = run_ssh_command(f"curl -s {API_URL}{endpoint}")
    if code != 0:
        return None, stderr
    try:
        return json.loads(stdout), None
    except json.JSONDecodeError as e:
        return None, f"JSON parse error: {e}\n{stdout}"

def print_header(text):
    """Print a section header"""
    print(f"\n{'='*70}")
    print(f"  {text}")
    print('='*70)

def print_result(test_name, success, details=''):
    """Print a test result"""
    status = f"{GREEN}✓{RESET}" if success else f"{RED}✗{RESET}"
    print(f"{status} {test_name}")
    if details:
        print(f"  {details}")

def test_backend_health():
    """Test 1: Backend health check"""
    print_header("Test 1: Backend Health Check")
    data, error = curl_json('/health')
    if error:
        print_result("Backend health check", False, error)
        return False
    if data and data.get('status') == 'ok':
        print_result("Backend health check", True, f"Status: {data['status']}, Timestamp: {data.get('timestamp', 'N/A')}")
        return True
    print_result("Backend health check", False, f"Unexpected response: {data}")
    return False

def test_admin_log_level_get():
    """Test 2: GET /admin/log-level"""
    print_header("Test 2: GET /admin/log-level")
    data, error = curl_json('/admin/log-level')
    if error:
        print_result("GET /admin/log-level", False, error)
        return False
    expected_keys = ['currentLevel', 'environment', 'logDir', 'fileLoggingEnabled', 'consoleLoggingEnabled']
    if all(key in data for key in expected_keys):
        print_result("GET /admin/log-level", True,
                    f"Level: {data['currentLevel']}, Env: {data['environment']}, Dir: {data['logDir']}")
        return True
    print_result("GET /admin/log-level", False, f"Missing keys in response: {data}")
    return False

def test_admin_log_level_post():
    """Test 3: POST /admin/log-level (Dynamic Change)"""
    print_header("Test 3: POST /admin/log-level (Dynamic Level Change)")

    # Step 1: Change to debug
    stdout, stderr, code = run_ssh_command(f"curl -s -X POST {API_URL}/admin/log-level -H 'Content-Type: application/json' -d '{{\"level\":\"debug\"}}'")
    if code != 0:
        print_result("POST /admin/log-level (set debug)", False, stderr)
        return False
    try:
        response = json.loads(stdout)
        if response.get('success') and response.get('currentLevel') == 'debug':
            print_result("POST /admin/log-level (set debug)", True, "Level changed to debug")
        else:
            print_result("POST /admin/log-level (set debug)", False, f"Unexpected response: {response}")
            return False
    except json.JSONDecodeError:
        print_result("POST /admin/log-level (set debug)", False, f"JSON parse error: {stdout}")
        return False

    # Step 2: Verify change
    data, error = curl_json('/admin/log-level')
    if error or data.get('currentLevel') != 'debug':
        print_result("Verify debug level", False, f"Level not updated: {data}")
        return False
    print_result("Verify debug level", True, "Level confirmed as debug")

    # Step 3: Change back to info
    stdout, stderr, code = run_ssh_command(f"curl -s -X POST {API_URL}/admin/log-level -H 'Content-Type: application/json' -d '{{\"level\":\"info\"}}'")
    if code != 0:
        print_result("POST /admin/log-level (reset info)", False, stderr)
        return False
    print_result("POST /admin/log-level (reset info)", True, "Level changed back to info")

    return True

def test_logs_stats():
    """Test 4: GET /api/logs/stats"""
    print_header("Test 4: GET /api/logs/stats")
    data, error = curl_json('/api/logs/stats')
    if error:
        print_result("GET /api/logs/stats", False, error)
        return False
    if data and data.get('success') and 'stats' in data:
        stats = data['stats']
        print_result("GET /api/logs/stats", True,
                    f"Files: {stats['totalFiles']}, Total Size: {stats['totalSizeFormatted']}, Dir: {stats['logDirectory']}")
        return True
    print_result("GET /api/logs/stats", False, f"Unexpected response: {data}")
    return False

def test_logs_filter():
    """Test 5: GET /api/logs/filter"""
    print_header("Test 5: GET /api/logs/filter (Filter by Level)")
    data, error = curl_json('/api/logs/filter?level=info&limit=3')
    if error:
        print_result("GET /api/logs/filter", False, error)
        return False
    if data and data.get('success') and 'logs' in data:
        print_result("GET /api/logs/filter", True,
                    f"Found {data['count']} logs (limit: {data['limit']})")
        if data['logs']:
            first_log = data['logs'][0]
            print(f"  First log: [{first_log.get('level', 'N/A')}] {first_log.get('message', 'N/A')[:60]}...")
        return True
    print_result("GET /api/logs/filter", False, f"Unexpected response: {data}")
    return False

def test_frontend_logging():
    """Test 6: POST /api/logs/frontend (Frontend Log Ingestion)"""
    print_header("Test 6: POST /api/logs/frontend (Frontend Log Ingestion)")
    log_payload = json.dumps({
        'logs': [{
            'level': 'info',
            'message': 'Test log from production test suite',
            'source': 'frontend',
            'component': 'test-suite',
            'sessionId': 'test-session-123',
            'context': {'test': True, 'timestamp': '2026-01-23T14:00:00Z'}
        }]
    })
    command = f"curl -s -X POST {API_URL}/api/logs/frontend -H 'Content-Type: application/json' -d '{log_payload}'"
    stdout, stderr, code = run_ssh_command(command)
    if code != 0:
        print_result("POST /api/logs/frontend", False, stderr)
        return False
    try:
        response = json.loads(stdout)
        if response.get('success'):
            print_result("POST /api/logs/frontend", True, response.get('message', 'Log received'))
            return True
        print_result("POST /api/logs/frontend", False, f"API returned error: {response}")
        return False
    except json.JSONDecodeError:
        print_result("POST /api/logs/frontend", False, f"JSON parse error: {stdout}")
        return False

def test_log_files():
    """Test 7: Verify log files exist and have content"""
    print_header("Test 7: Log Files Verification")
    stdout, stderr, code = run_ssh_command("ls -lh /var/log/terrainsim/*.log")
    if code != 0:
        print_result("Log files check", False, stderr)
        return False
    files = [line for line in stdout.strip().split('\n') if line]
    print_result("Log files check", True, f"Found {len(files)} log files")
    for file in files[:3]:  # Show first 3 files
        print(f"  {file}")
    return True

def test_pm2_status():
    """Test 8: PM2 process status"""
    print_header("Test 8: PM2 Process Status")
    stdout, stderr, code = run_ssh_command("pm2 jlist")
    if code != 0:
        print_result("PM2 status check", False, stderr)
        return False
    try:
        processes = json.loads(stdout)
        terrainsim = next((p for p in processes if p['name'] == 'terrainsim-api'), None)
        if terrainsim:
            status = terrainsim['pm2_env']['status']
            uptime_ms = terrainsim['pm2_env']['pm_uptime']
            uptime_min = (int(uptime_ms) / 1000 / 60) if uptime_ms else 0
            print_result("PM2 status check", True,
                        f"Status: {status}, Uptime: {uptime_min:.1f} minutes, PID: {terrainsim.get('pid', 'N/A')}")
            return True
        print_result("PM2 status check", False, "terrainsim-api process not found")
        return False
    except (json.JSONDecodeError, KeyError) as e:
        print_result("PM2 status check", False, f"Parse error: {e}")
        return False

def main():
    """Run all tests"""
    print(f"\n{'='*70}")
    print(f"  {BLUE}TerrainSim Production Testing Suite (SSH-based){RESET}")
    print(f"  {YELLOW}Testing via direct SSH connection to bypass proxy issues{RESET}")
    print('='*70)
    print(f"\nProduction Server: {SERVER}")
    print(f"API URL (internal): {API_URL}")
    print(f"SSH Key: {SSH_KEY}")

    tests = [
        ("Backend Health Check", test_backend_health),
        ("GET /admin/log-level", test_admin_log_level_get),
        ("POST /admin/log-level", test_admin_log_level_post),
        ("GET /api/logs/stats", test_logs_stats),
        ("GET /api/logs/filter", test_logs_filter),
        ("POST /api/logs/frontend", test_frontend_logging),
        ("Log Files Verification", test_log_files),
        ("PM2 Process Status", test_pm2_status),
    ]

    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, "PASS" if passed else "FAIL"))
        except Exception as e:
            print_result(name, False, f"Exception: {e}")
            results.append((name, "FAIL"))

    # Summary
    print_header("Test Results Summary")
    print(f"\n{'Test':<50} {'Status':>8}")
    print('-' * 60)
    for name, status in results:
        color = GREEN if status == "PASS" else RED
        print(f"{name:<50} {color}{status:>8}{RESET}")

    passed = sum(1 for _, status in results if status == "PASS")
    failed = len(results) - passed

    print('='*60)
    print(f"Total: {len(results)}  {GREEN}Passed: {passed}{RESET}  {RED}Failed: {failed}{RESET}")
    print('='*60)

    if failed > 0:
        print(f"\n{YELLOW}⚠️ Some tests failed. Review errors above.{RESET}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}✅ All tests passed! Winston logging infrastructure is working!{RESET}")
        sys.exit(0)

if __name__ == '__main__':
    main()
