#!/usr/bin/env python3
"""
Capture frontend logs by extracting them from backend simulation log files.

Frontend logs are sent to the backend via remote logging and stored in the
simulation log files with `source: 'frontend'`. This script extracts those
frontend-specific logs and saves them separately for easier analysis.

Usage:
    # Capture frontend logs from production
    python scripts/capture-frontend-logs.py production

    # Capture frontend logs from local
    python scripts/capture-frontend-logs.py local

    # Specify date
    python scripts/capture-frontend-logs.py production --date 2026-01-22

    # Specify output directory
    python scripts/capture-frontend-logs.py local --output logs/captured/frontend
"""

import os
import sys
import json
import subprocess
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any


class FrontendLogCapture:
    """Extract frontend logs from backend simulation logs."""

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

    def extract_frontend_logs(
        self,
        simulation_log_path: Path,
        output_path: Path
    ) -> int:
        """Extract frontend logs from simulation log file."""
        if not simulation_log_path.exists():
            print(f"  ⚠️  File not found: {simulation_log_path}")
            return 0

        frontend_logs: List[Dict[str, Any]] = []

        with open(simulation_log_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    log_entry = json.loads(line)
                    # Check if this is a frontend log
                    if log_entry.get('source') == 'frontend':
                        frontend_logs.append(log_entry)
                except json.JSONDecodeError:
                    # Skip malformed lines
                    continue

        if frontend_logs:
            # Write extracted logs to output file
            with open(output_path, 'w', encoding='utf-8') as f:
                for log in frontend_logs:
                    f.write(json.dumps(log) + '\n')

        return len(frontend_logs)

    def capture_production_logs(
        self,
        output_dir: Path,
        date: Optional[str] = None
    ) -> None:
        """Capture frontend logs from production server."""
        print(f"📥 Capturing frontend logs from production ({self.server})...")

        output_dir.mkdir(parents=True, exist_ok=True)

        # Determine date to capture
        if date:
            log_date = date
        else:
            log_date = datetime.now().strftime("%Y-%m-%d")

        print(f"  Target date: {log_date}")

        # Download simulation log (contains frontend logs)
        remote_log = f"{self.remote_log_dir}/simulation-{log_date}.log"
        temp_log = output_dir / f"temp-simulation-{log_date}.log"

        print(f"  📁 Downloading simulation log...")

        # Check if file exists on server
        check_cmd = f"test -f {remote_log} && echo 'exists' || echo 'missing'"
        stdout, stderr, code = self.run_ssh_command(check_cmd)

        if "exists" not in stdout:
            print(f"    ⚠️  Simulation log not found on server for {log_date}")
            return

        # Download file via SCP
        result = subprocess.run(
            [
                "scp",
                "-o", "StrictHostKeyChecking=no",
                f"{self.server}:{remote_log}",
                str(temp_log)
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print(f"    ❌ Failed to download simulation log")
            print(f"       Error: {result.stderr}")
            return

        print(f"    ✅ Downloaded simulation log")

        # Extract frontend logs
        output_file = output_dir / f"frontend-{log_date}.log"
        print(f"  🔍 Extracting frontend logs...")

        count = self.extract_frontend_logs(temp_log, output_file)

        if count > 0:
            file_size = output_file.stat().st_size
            print(f"    ✅ Extracted {count} frontend log(s) ({file_size:,} bytes)")
        else:
            print(f"    ⚠️  No frontend logs found")
            # Remove empty file
            if output_file.exists():
                output_file.unlink()

        # Clean up temp file
        temp_log.unlink()

    def capture_local_logs(
        self,
        output_dir: Path,
        date: Optional[str] = None
    ) -> None:
        """Capture frontend logs from local development environment."""
        print("📥 Capturing frontend logs from local environment...")

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

        # Find simulation log
        simulation_log = self.local_log_dir / f"simulation-{log_date}.log"

        if not simulation_log.exists():
            print(f"  ⚠️  Simulation log not found: simulation-{log_date}.log")
            return

        # Extract frontend logs
        output_file = output_dir / f"frontend-{log_date}.log"
        print(f"  🔍 Extracting frontend logs...")

        count = self.extract_frontend_logs(simulation_log, output_file)

        if count > 0:
            file_size = output_file.stat().st_size
            print(f"    ✅ Extracted {count} frontend log(s) ({file_size:,} bytes)")
        else:
            print(f"    ⚠️  No frontend logs found")
            # Remove empty file
            if output_file.exists():
                output_file.unlink()

    def generate_summary(self, output_dir: Path) -> None:
        """Generate summary of captured frontend logs."""
        print("\n📊 Frontend Log Summary:")

        log_files = sorted(output_dir.glob("frontend-*.log"))

        if not log_files:
            print("  No frontend logs captured")
            return

        total_entries = 0
        for log_file in log_files:
            count = sum(1 for _ in open(log_file, 'r'))
            size = log_file.stat().st_size
            print(f"  {log_file.name:<30} {count:>6} entries  {size:>10,} bytes")
            total_entries += count

        print(f"\n  Total: {total_entries} frontend log entries")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Capture frontend logs from backend simulation logs"
    )
    parser.add_argument(
        "environment",
        choices=["production", "local"],
        help="Environment to capture logs from"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="logs/captured/frontend",
        help="Output directory for captured logs"
    )
    parser.add_argument(
        "--date",
        type=str,
        help="Specific date to capture (YYYY-MM-DD). Default: today"
    )
    parser.add_argument(
        "--last-n-days",
        type=int,
        help="Capture logs from last N days"
    )

    args = parser.parse_args()

    capture = FrontendLogCapture()
    output_dir = Path(args.output)

    print("=" * 60)
    print("🌐 Frontend Log Capture")
    print("=" * 60)
    print(f"  Environment: {args.environment}")
    print(f"  Output Dir:  {output_dir}")
    print("=" * 60 + "\n")

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

    # Generate summary
    capture.generate_summary(output_dir)

    print(f"\n📂 Frontend logs saved to: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
