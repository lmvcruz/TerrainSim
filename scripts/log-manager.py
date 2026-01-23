#!/usr/bin/env python3
"""
Unified TerrainSim Log Manager CLI.

Central command-line interface for all logging operations including:
- Capturing deployment logs
- Capturing execution logs
- Cleaning old logs
- Setting log levels
- Filtering and searching logs
- Viewing logs in real-time
- System status

Usage:
    python scripts/log-manager.py <action> [options]

Actions:
    capture-deployment <type>          Capture deployment logs
    capture-execution <env> <comp>     Capture execution logs
    clean <env> <component> [days]     Clean old logs
    set-level <env> <comp> <level>     Set log level
    filter <env> <type> <value>        Filter logs
    view <env> <component>             View logs in real-time
    status                             Show logging system status
    help                               Show this help

Examples:
    python scripts/log-manager.py status
    python scripts/log-manager.py capture-execution production backend
    python scripts/log-manager.py clean local backend 7
    python scripts/log-manager.py set-level production backend info
    python scripts/log-manager.py filter production level error
    python scripts/log-manager.py view production backend
"""

import sys
import subprocess
from pathlib import Path
from datetime import datetime


class LogManager:
    """Unified log management CLI."""

    def __init__(self):
        """Initialize log manager."""
        self.scripts_dir = Path("scripts")
        self.server = "ubuntu@54.242.131.12"

    def run_script(self, script_name: str, args: list) -> int:
        """Run a Python script with arguments."""
        script_path = self.scripts_dir / script_name

        if not script_path.exists():
            print(f"❌ Error: Script not found: {script_path}")
            return 1

        result = subprocess.run(
            [sys.executable, str(script_path)] + args,
            text=True
        )
        return result.returncode

    def run_ssh_command(self, command: str) -> tuple[str, str, int]:
        """Execute command on remote server via SSH."""
        result = subprocess.run(
            ["ssh", "-o", "StrictHostKeyChecking=no", self.server, command],
            capture_output=True,
            text=True
        )
        return result.stdout, result.stderr, result.returncode

    def capture_deployment_logs(self, deployment_type: str) -> None:
        """Capture deployment logs from GitHub Actions or direct."""
        print(f"📥 Capturing {deployment_type} deployment logs...\n")

        if deployment_type in ["cloudflare", "frontend"]:
            # Use capture-cloudflare-deployment-logs.py
            self.run_script("capture-cloudflare-deployment-logs.py", [])
        elif deployment_type in ["backend"]:
            print("💡 Backend deployment logs are captured in the deployment workflow")
            print("   Or run: python scripts/log-manager.py capture-execution production backend")
        else:
            print(f"❌ Unknown deployment type: {deployment_type}")
            print("   Valid types: cloudflare, frontend, backend")

    def capture_execution_logs(self, environment: str, component: str) -> None:
        """Capture execution/runtime logs."""
        print(f"📥 Capturing {component} logs from {environment}...\n")

        if component == "backend":
            self.run_script("capture-backend-logs.py", [environment])
        elif component == "frontend":
            self.run_script("capture-frontend-logs.py", [environment])
        else:
            print(f"❌ Unknown component: {component}")
            print("   Valid components: backend, frontend")

    def clean_logs(self, environment: str, component: str, days: int) -> None:
        """Clean old logs."""
        print(f"🧹 Cleaning {component} logs on {environment}...\n")

        if component == "backend":
            self.run_script("clean-backend-logs.py", [environment, "--days", str(days)])
        elif component == "frontend":
            self.run_script("clean-frontend-logs.py", ["--days", str(days)])
        else:
            print(f"❌ Unknown component: {component}")
            print("   Valid components: backend, frontend")

    def set_log_level(self, environment: str, component: str, level: str) -> None:
        """Set log level."""
        print(f"📊 Setting {component} log level to '{level}' on {environment}...\n")
        self.run_script("set-log-level.py", [environment, component, level])

    def filter_logs(self, environment: str, filter_type: str, filter_value: str) -> None:
        """Filter and search logs."""
        print(f"🔍 Filtering {environment} logs...\n")
        self.run_script("filter-logs.py", [environment, filter_type, filter_value])

    def view_logs(self, environment: str, component: str) -> None:
        """View logs in real-time."""
        today = datetime.now().strftime('%Y-%m-%d')

        print(f"👀 Viewing {component} logs on {environment} (real-time)...\n")
        print("Press Ctrl+C to stop\n")

        if environment == "production":
            if component == "backend":
                log_file = f"/var/log/terrainsim/app-{today}.log"
                cmd = f"tail -f {log_file}"
            elif component == "frontend":
                log_file = f"/var/log/terrainsim/simulation-{today}.log"
                cmd = f"tail -f {log_file} | grep '\"source\":\"frontend\"'"
            else:
                print(f"❌ Unknown component: {component}")
                return

            subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", self.server, cmd])

        else:  # local
            if component == "backend":
                log_file = f"apps/simulation-api/logs/app-{today}.log"
            elif component == "frontend":
                log_file = f"apps/simulation-api/logs/simulation-{today}.log"
            else:
                print(f"❌ Unknown component: {component}")
                return

            if not Path(log_file).exists():
                print(f"⚠️  Log file not found: {log_file}")
                return

            if component == "frontend":
                # Filter for frontend logs
                subprocess.run(
                    ["powershell", "-Command",
                     f"Get-Content {log_file} -Wait | Where-Object {{ $_ -match '\"source\":\"frontend\"' }}"],
                    shell=True
                )
            else:
                subprocess.run(["powershell", "-Command", f"Get-Content {log_file} -Wait"], shell=True)

    def show_status(self) -> None:
        """Show logging system status."""
        print("=" * 70)
        print("📊 TerrainSim Logging System Status")
        print("=" * 70)

        # Backend Production
        print("\n🔧 Backend (Production):")
        status_script = '''
echo "  Server: 54.242.131.12"
echo "  Log Directory: /var/log/terrainsim"
if [ -f /var/www/terrainsim/.env ]; then
    echo "  Log Level: $(grep LOG_LEVEL /var/www/terrainsim/.env | cut -d= -f2 || echo 'not set')"
fi
if [ -d /var/log/terrainsim ]; then
    echo "  Disk Usage: $(du -sh /var/log/terrainsim 2>/dev/null | cut -f1 || echo 'unknown')"
    echo "  Latest Logs:"
    ls -lht /var/log/terrainsim/*.log 2>/dev/null | head -3 | awk '{print "    " $9 " - " $5}'
fi
'''
        stdout, stderr, code = self.run_ssh_command(status_script)
        if stdout:
            print(stdout)
        elif code != 0:
            print(f"  ⚠️  Could not connect to production server")

        # Backend Local
        print("🔧 Backend (Local):")
        local_log_dir = Path("apps/simulation-api/logs")
        env_file = Path("apps/simulation-api/.env.development")

        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.startswith("LOG_LEVEL"):
                        print(f"  {line.strip()}")
        else:
            print("  Log Level: not configured")

        if local_log_dir.exists():
            log_files = list(local_log_dir.glob("*.log"))
            if log_files:
                total_size = sum(f.stat().st_size for f in log_files)
                print(f"  Log Directory: {local_log_dir}")
                print(f"  Log Files: {len(log_files)}")
                print(f"  Total Size: {total_size:,} bytes ({total_size / (1024*1024):.2f} MB)")
            else:
                print("  No log files found")
        else:
            print("  Log directory not found")

        # Frontend
        print("\n🌐 Frontend:")
        prod_env = Path("apps/web/.env.production")
        dev_env = Path("apps/web/.env.development")

        if prod_env.exists():
            print("  Production:")
            with open(prod_env) as f:
                for line in f:
                    if line.startswith("VITE_LOG"):
                        print(f"    {line.strip()}")

        if dev_env.exists():
            print("  Development:")
            with open(dev_env) as f:
                for line in f:
                    if line.startswith("VITE_LOG"):
                        print(f"    {line.strip()}")

        # Captured Logs
        print("\n📦 Captured Logs:")
        captured_dir = Path("logs/captured")
        if captured_dir.exists():
            for subdir in ["backend", "frontend", "deployments"]:
                subpath = captured_dir / subdir
                if subpath.exists():
                    files = list(subpath.rglob("*"))
                    files = [f for f in files if f.is_file()]
                    if files:
                        total_size = sum(f.stat().st_size for f in files)
                        print(f"  {subdir}: {len(files)} file(s), {total_size:,} bytes ({total_size / (1024*1024):.2f} MB)")
        else:
            print("  No captured logs directory")

        print("\n" + "=" * 70)

    def show_help(self) -> None:
        """Show help message."""
        print("""
TerrainSim Log Manager

Usage: python scripts/log-manager.py <action> [options]

═══════════════════════════════════════════════════════════════════════

Actions:

  capture-deployment <type>
      Capture deployment logs from GitHub Actions or Cloudflare
      Types: cloudflare, frontend, backend

  capture-execution <environment> <component>
      Capture execution/runtime logs
      Environments: production, local
      Components: backend, frontend

  clean <environment> <component> [days]
      Clean old logs (default: 14 days backend, 3 days frontend)
      Environments: production, local
      Components: backend, frontend

  set-level <environment> <component> <level>
      Set log level dynamically
      Environments: production, local
      Components: backend, frontend
      Levels: trace, debug, info, warn, error

  filter <environment> <type> <value>
      Filter and search logs via API
      Environments: production, local
      Types: level, source, search, session, date

  view <environment> <component>
      View logs in real-time (tail -f)
      Environments: production, local
      Components: backend, frontend

  status
      Show logging system status

  help
      Show this help message

═══════════════════════════════════════════════════════════════════════

Examples:

  # Show status
  python scripts/log-manager.py status

  # Capture production backend logs
  python scripts/log-manager.py capture-execution production backend

  # Capture Cloudflare deployment logs
  python scripts/log-manager.py capture-deployment cloudflare

  # Clean old production backend logs (keep last 14 days)
  python scripts/log-manager.py clean production backend 14

  # Clean local frontend logs (keep last 3 days)
  python scripts/log-manager.py clean local frontend 3

  # Set production backend to debug level
  python scripts/log-manager.py set-level production backend debug

  # Filter production logs for errors
  python scripts/log-manager.py filter production level error

  # View production backend logs in real-time
  python scripts/log-manager.py view production backend

═══════════════════════════════════════════════════════════════════════
""")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        manager = LogManager()
        manager.show_help()
        sys.exit(0)

    action = sys.argv[1]
    args = sys.argv[2:]

    manager = LogManager()

    try:
        if action == "capture-deployment":
            if len(args) < 1:
                print("❌ Error: Missing deployment type")
                print("Usage: python scripts/log-manager.py capture-deployment <type>")
                sys.exit(1)
            manager.capture_deployment_logs(args[0])

        elif action == "capture-execution":
            if len(args) < 2:
                print("❌ Error: Missing environment or component")
                print("Usage: python scripts/log-manager.py capture-execution <env> <component>")
                sys.exit(1)
            manager.capture_execution_logs(args[0], args[1])

        elif action == "clean":
            if len(args) < 2:
                print("❌ Error: Missing environment or component")
                print("Usage: python scripts/log-manager.py clean <env> <component> [days]")
                sys.exit(1)
            days = int(args[2]) if len(args) > 2 else (14 if args[1] == "backend" else 3)
            manager.clean_logs(args[0], args[1], days)

        elif action == "set-level":
            if len(args) < 3:
                print("❌ Error: Missing environment, component, or level")
                print("Usage: python scripts/log-manager.py set-level <env> <component> <level>")
                sys.exit(1)
            manager.set_log_level(args[0], args[1], args[2])

        elif action == "filter":
            if len(args) < 3:
                print("❌ Error: Missing environment, type, or value")
                print("Usage: python scripts/log-manager.py filter <env> <type> <value>")
                sys.exit(1)
            manager.filter_logs(args[0], args[1], args[2])

        elif action == "view":
            if len(args) < 2:
                print("❌ Error: Missing environment or component")
                print("Usage: python scripts/log-manager.py view <env> <component>")
                sys.exit(1)
            manager.view_logs(args[0], args[1])

        elif action == "status":
            manager.show_status()

        elif action == "help":
            manager.show_help()

        else:
            print(f"❌ Unknown action: {action}")
            print("Run 'python scripts/log-manager.py help' for usage information")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
