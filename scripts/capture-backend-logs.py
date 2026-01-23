#!/usr/bin/env python3
"""
Capture backend execution logs from production or local environment.

This script downloads backend application logs from the production EC2 server
via SSH/SCP or captures local logs from the development environment.

Requirements:
    - SSH access to production server (via SSH key)
    - scp command available

Usage:
    # Capture production logs
    python scripts/capture-backend-logs.py production

    # Capture local logs
    python scripts/capture-backend-logs.py local

    # Specify output directory
    python scripts/capture-backend-logs.py production --output logs/captured/backend

    # Capture specific date
    python scripts/capture-backend-logs.py production --date 2026-01-22
"""

import os
import sys
import subprocess
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional


class BackendLogCapture:
    """Capture backend execution logs."""

    def __init__(self, server: str = "ubuntu@54.242.131.12"):
        """Initialize with server connection info."""
        self.server = server
        self.remote_log_dir = "/var/log/terrainsim"
        self.local_log_dir = Path("apps/simulation-api/logs")

    def run_ssh_command(self, command: str) -> tuple[str, str, int]:
        """Execute command on remote server via SSH."""
        result = subprocess.run(
            ["ssh", "-o", "StrictHostKeyChecking=no", self.server, command],
            capture_output=True,
            text=True
        )
        return result.stdout, result.stderr, result.returncode

    def capture_production_logs(
        self,
        output_dir: Path,
        date: Optional[str] = None
    ) -> None:
        """Capture logs from production server."""
        print(f"📥 Capturing backend logs from production ({self.server})...")

        output_dir.mkdir(parents=True, exist_ok=True)

        # Determine date to capture
        if date:
            log_date = date
        else:
            log_date = datetime.now().strftime("%Y-%m-%d")

        print(f"  Target date: {log_date}")

        # List of log files to capture
        log_patterns = [
            f"app-{log_date}.log",
            f"error-{log_date}.log",
            f"simulation-{log_date}.log"
        ]

        captured_count = 0
        missing_count = 0

        for pattern in log_patterns:
            remote_path = f"{self.remote_log_dir}/{pattern}"
            local_path = output_dir / f"production-{pattern}"

            print(f"  📁 Capturing {pattern}...")

            # Check if file exists on server
            check_cmd = f"test -f {remote_path} && echo 'exists' || echo 'missing'"
            stdout, stderr, code = self.run_ssh_command(check_cmd)

            if "exists" in stdout:
                # Download file via SCP
                result = subprocess.run(
                    [
                        "scp",
                        "-o", "StrictHostKeyChecking=no",
                        f"{self.server}:{remote_path}",
                        str(local_path)
                    ],
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    file_size = local_path.stat().st_size
                    print(f"    ✅ Captured {pattern} ({file_size:,} bytes)")
                    captured_count += 1
                else:
                    print(f"    ❌ Failed to download {pattern}")
                    print(f"       Error: {result.stderr}")
            else:
                print(f"    ⚠️  File not found: {pattern}")
                missing_count += 1

        print(f"\n✅ Captured {captured_count} file(s)")
        if missing_count > 0:
            print(f"⚠️  {missing_count} file(s) not found on server")

        # Capture PM2 status
        print("\n📊 Capturing PM2 status...")
        pm2_status_file = output_dir / f"pm2-status-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        stdout, stderr, code = self.run_ssh_command("pm2 jlist")

        if code == 0:
            with open(pm2_status_file, 'w') as f:
                f.write(stdout)
            print(f"  ✅ PM2 status saved to {pm2_status_file.name}")
        else:
            print(f"  ⚠️  Could not capture PM2 status")

    def capture_local_logs(
        self,
        output_dir: Path,
        date: Optional[str] = None
    ) -> None:
        """Capture logs from local development environment."""
        print("📥 Capturing backend logs from local environment...")

        if not self.local_log_dir.exists():
            print(f"❌ Local log directory not found: {self.local_log_dir}")
            print("  Make sure the backend has been run at least once.")
            return

        output_dir.mkdir(parents=True, exist_ok=True)

        # Determine date to capture
        if date:
            log_date = date
        else:
            log_date = datetime.now().strftime("%Y-%m-%d")

        print(f"  Target date: {log_date}")

        # List of log files to capture
        log_patterns = [
            f"app-{log_date}.log",
            f"error-{log_date}.log",
            f"simulation-{log_date}.log"
        ]

        captured_count = 0
        missing_count = 0

        for pattern in log_patterns:
            source_path = self.local_log_dir / pattern
            dest_path = output_dir / f"local-{pattern}"

            if source_path.exists():
                # Copy file
                import shutil
                shutil.copy2(source_path, dest_path)

                file_size = dest_path.stat().st_size
                print(f"  ✅ Captured {pattern} ({file_size:,} bytes)")
                captured_count += 1
            else:
                print(f"  ⚠️  File not found: {pattern}")
                missing_count += 1

        print(f"\n✅ Captured {captured_count} file(s)")
        if missing_count > 0:
            print(f"⚠️  {missing_count} file(s) not found locally")

    def list_available_logs(self, environment: str) -> None:
        """List available log files."""
        print(f"📋 Available backend logs ({environment}):\n")

        if environment == "production":
            # List remote logs
            cmd = f"ls -lh {self.remote_log_dir}/*.log 2>/dev/null || echo 'No logs found'"
            stdout, stderr, code = self.run_ssh_command(cmd)

            if code == 0:
                print(stdout)
            else:
                print(f"❌ Error listing logs: {stderr}")
        else:
            # List local logs
            if self.local_log_dir.exists():
                log_files = sorted(self.local_log_dir.glob("*.log"))
                if log_files:
                    for log_file in log_files:
                        size = log_file.stat().st_size
                        modified = datetime.fromtimestamp(log_file.stat().st_mtime)
                        print(f"  {log_file.name:<30} {size:>10,} bytes  {modified:%Y-%m-%d %H:%M:%S}")
                else:
                    print("  No log files found")
            else:
                print(f"  ❌ Local log directory not found: {self.local_log_dir}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Capture backend execution logs"
    )
    parser.add_argument(
        "environment",
        choices=["production", "local"],
        help="Environment to capture logs from"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="logs/captured/backend",
        help="Output directory for captured logs"
    )
    parser.add_argument(
        "--date",
        type=str,
        help="Specific date to capture (YYYY-MM-DD). Default: today"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available log files instead of capturing"
    )
    parser.add_argument(
        "--last-n-days",
        type=int,
        help="Capture logs from last N days"
    )

    args = parser.parse_args()

    capture = BackendLogCapture()
    output_dir = Path(args.output)

    print("=" * 60)
    print("📦 Backend Log Capture")
    print("=" * 60)
    print(f"  Environment: {args.environment}")
    print(f"  Output Dir:  {output_dir}")
    print("=" * 60 + "\n")

    # List mode
    if args.list:
        capture.list_available_logs(args.environment)
        return

    # Capture logs
    if args.last_n_days:
        # Capture multiple days
        print(f"📅 Capturing logs from last {args.last_n_days} day(s)...\n")

        for i in range(args.last_n_days):
            date_obj = datetime.now() - timedelta(days=i)
            date_str = date_obj.strftime("%Y-%m-%d")

            print(f"\n{'='*60}")
            print(f"Capturing logs for {date_str}")
            print('='*60)

            if args.environment == "production":
                capture.capture_production_logs(output_dir, date_str)
            else:
                capture.capture_local_logs(output_dir, date_str)
    else:
        # Capture single date
        if args.environment == "production":
            capture.capture_production_logs(output_dir, args.date)
        else:
            capture.capture_local_logs(output_dir, args.date)

    print(f"\n📂 Logs saved to: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
