#!/usr/bin/env python3
"""
Clean old backend log files based on retention policy.

This script removes log files older than the specified retention period,
both locally and on production server. It respects the retention policies
defined in the logging infrastructure plan.

Default retention periods:
- App logs: 14 days
- Error logs: 30 days
- Simulation logs: 7 days

Usage:
    # Clean production logs (default: 14 days)
    python scripts/clean-backend-logs.py production

    # Clean local logs (default: 7 days)
    python scripts/clean-backend-logs.py local

    # Specify retention period
    python scripts/clean-backend-logs.py production --days 30

    # Dry run (show what would be deleted)
    python scripts/clean-backend-logs.py production --dry-run
"""

import os
import sys
import subprocess
import argparse
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple


class BackendLogCleaner:
    """Clean old backend log files."""

    def __init__(self, server: str = "ubuntu@54.242.131.12"):
        """Initialize with server connection info."""
        self.server = server
        self.remote_log_dir = "/var/log/terrainsim"
        self.local_log_dir = Path("apps/simulation-api/logs")
        # SSH key path for Windows
        self.ssh_key = r"C:\Users\l-cruz\.ssh\terrainsim-key.pem"

    def run_ssh_command(self, command: str) -> tuple[str, str, int]:
        """Execute command on remote server via SSH."""
        result = subprocess.run(
            ["ssh", "-i", self.ssh_key, "-o", "StrictHostKeyChecking=no", self.server, command],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return result.stdout, result.stderr, result.returncode

    def clean_production_logs(
        self,
        retention_days: int,
        dry_run: bool = False
    ) -> None:
        """Clean old logs on production server."""
        print(f"🧹 Cleaning backend logs on production ({self.server})...")
        print(f"  Retention: {retention_days} days")
        print(f"  Mode: {'DRY RUN' if dry_run else 'DELETE'}\n")

        # Build find command to locate old files
        find_cmd = f"""
cd {self.remote_log_dir}
echo "📁 Current log directory size:"
du -sh {self.remote_log_dir}
echo ""
echo "📋 Log files older than {retention_days} days:"
find {self.remote_log_dir} -name "*.log" -type f -mtime +{retention_days} -exec ls -lh {{}} \\;
"""

        stdout, stderr, code = self.run_ssh_command(find_cmd)

        if code != 0:
            print(f"❌ Error listing files: {stderr}")
            return

        if stdout:
            print(stdout)

        if not stdout or "No such file or directory" in stdout or not stdout.strip():
            print("✅ No old log files to clean")
            return

        # Count files to delete
        count_cmd = f"find {self.remote_log_dir} -name '*.log' -type f -mtime +{retention_days} | wc -l"
        count_out, _, _ = self.run_ssh_command(count_cmd)
        file_count = int(count_out.strip()) if count_out.strip().isdigit() else 0

        if file_count == 0:
            print("✅ No old log files to clean")
            return

        print(f"\n🗑️  Found {file_count} file(s) to delete")

        if dry_run:
            print("  (Dry run - no files deleted)")
            return

        # Delete old files
        delete_cmd = f"""
find {self.remote_log_dir} -name "*.log" -type f -mtime +{retention_days} -delete
echo "✅ Deleted {file_count} old log file(s)"
echo ""
echo "📁 New log directory size:"
du -sh {self.remote_log_dir}
"""

        stdout, stderr, code = self.run_ssh_command(delete_cmd)

        if code == 0:
            print(stdout)
        else:
            print(f"❌ Error deleting files: {stderr}")

    def clean_local_logs(
        self,
        retention_days: int,
        dry_run: bool = False
    ) -> None:
        """Clean old logs in local development environment."""
        print("🧹 Cleaning backend logs in local environment...")
        print(f"  Retention: {retention_days} days")
        print(f"  Mode: {'DRY RUN' if dry_run else 'DELETE'}\n")

        if not self.local_log_dir.exists():
            print(f"❌ Local log directory not found: {self.local_log_dir}")
            return

        # Calculate cutoff time
        cutoff_time = time.time() - (retention_days * 86400)
        cutoff_date = datetime.fromtimestamp(cutoff_time)

        print(f"  Directory: {self.local_log_dir}")
        print(f"  Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Find old log files
        old_files: List[Tuple[Path, datetime]] = []

        for log_file in self.local_log_dir.glob("*.log"):
            if log_file.is_file():
                mtime = log_file.stat().st_mtime
                if mtime < cutoff_time:
                    modified_date = datetime.fromtimestamp(mtime)
                    old_files.append((log_file, modified_date))

        if not old_files:
            print("✅ No old log files to clean")
            return

        # Sort by modification time
        old_files.sort(key=lambda x: x[1])

        print(f"📋 Files to delete ({len(old_files)}):")
        total_size = 0
        for log_file, modified_date in old_files:
            size = log_file.stat().st_size
            total_size += size
            age_days = (datetime.now() - modified_date).days
            print(f"  {log_file.name:<30} {size:>10,} bytes  {age_days:>3} days old")

        print(f"\n  Total size: {total_size:,} bytes ({total_size / (1024*1024):.2f} MB)")

        if dry_run:
            print("\n  (Dry run - no files deleted)")
            return

        # Delete files
        deleted_count = 0
        for log_file, _ in old_files:
            try:
                log_file.unlink()
                deleted_count += 1
            except OSError as e:
                print(f"  ⚠️  Failed to delete {log_file.name}: {e}")

        print(f"\n✅ Deleted {deleted_count}/{len(old_files)} file(s)")

        # Show remaining space
        remaining_files = list(self.local_log_dir.glob("*.log"))
        if remaining_files:
            remaining_size = sum(f.stat().st_size for f in remaining_files)
            print(f"📁 Remaining: {len(remaining_files)} file(s), {remaining_size:,} bytes ({remaining_size / (1024*1024):.2f} MB)")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Clean old backend log files"
    )
    parser.add_argument(
        "environment",
        choices=["production", "local"],
        help="Environment to clean logs from"
    )
    parser.add_argument(
        "--days",
        type=int,
        help="Retention period in days. Default: 14 for production, 7 for local"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )

    args = parser.parse_args()

    # Set default retention based on environment
    if args.days:
        retention_days = args.days
    else:
        retention_days = 14 if args.environment == "production" else 7

    cleaner = BackendLogCleaner()

    print("=" * 60)
    print("🧹 Backend Log Cleanup")
    print("=" * 60)
    print(f"  Environment: {args.environment}")
    print(f"  Retention:   {retention_days} days")
    print(f"  Mode:        {'DRY RUN' if args.dry_run else 'DELETE'}")
    print("=" * 60 + "\n")

    if args.environment == "production":
        cleaner.clean_production_logs(retention_days, args.dry_run)
    else:
        cleaner.clean_local_logs(retention_days, args.dry_run)

    print("\n✅ Cleanup complete")


if __name__ == "__main__":
    main()
