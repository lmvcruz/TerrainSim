#!/usr/bin/env python3
"""
Clean old frontend log files based on retention policy.

Frontend logs are extracted from backend simulation logs and stored separately.
This script removes old extracted frontend log files. Note that frontend logs
on production are part of the simulation logs and are cleaned by the backend
log cleanup script.

Default retention period: 3 days for captured frontend logs

Usage:
    # Clean captured frontend logs (default: 3 days)
    python scripts/clean-frontend-logs.py

    # Specify retention period
    python scripts/clean-frontend-logs.py --days 7

    # Dry run (show what would be deleted)
    python scripts/clean-frontend-logs.py --dry-run

    # Specify directory
    python scripts/clean-frontend-logs.py --dir logs/captured/frontend
"""

import sys
import argparse
import time
from datetime import datetime
from pathlib import Path
from typing import List, Tuple


class FrontendLogCleaner:
    """Clean old frontend log files."""

    def clean_captured_logs(
        self,
        log_dir: Path,
        retention_days: int,
        dry_run: bool = False
    ) -> None:
        """Clean old captured frontend log files."""
        print("🧹 Cleaning captured frontend logs...")
        print(f"  Directory: {log_dir}")
        print(f"  Retention: {retention_days} days")
        print(f"  Mode: {'DRY RUN' if dry_run else 'DELETE'}\n")

        if not log_dir.exists():
            print(f"⚠️  Directory not found: {log_dir}")
            print("  No logs to clean")
            return

        # Calculate cutoff time
        cutoff_time = time.time() - (retention_days * 86400)
        cutoff_date = datetime.fromtimestamp(cutoff_time)

        print(f"  Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Find old frontend log files
        old_files: List[Tuple[Path, datetime]] = []

        for log_file in log_dir.glob("frontend-*.log"):
            if log_file.is_file():
                mtime = log_file.stat().st_mtime
                if mtime < cutoff_time:
                    modified_date = datetime.fromtimestamp(mtime)
                    old_files.append((log_file, modified_date))

        if not old_files:
            print("✅ No old frontend log files to clean")
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
        remaining_files = list(log_dir.glob("frontend-*.log"))
        if remaining_files:
            remaining_size = sum(f.stat().st_size for f in remaining_files)
            print(f"📁 Remaining: {len(remaining_files)} file(s), {remaining_size:,} bytes ({remaining_size / (1024*1024):.2f} MB)")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Clean old frontend log files"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=3,
        help="Retention period in days (default: 3)"
    )
    parser.add_argument(
        "--dir",
        type=str,
        default="logs/captured/frontend",
        help="Directory containing frontend logs"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )

    args = parser.parse_args()

    log_dir = Path(args.dir)
    cleaner = FrontendLogCleaner()

    print("=" * 60)
    print("🧹 Frontend Log Cleanup")
    print("=" * 60)
    print(f"  Directory:   {log_dir}")
    print(f"  Retention:   {args.days} days")
    print(f"  Mode:        {'DRY RUN' if args.dry_run else 'DELETE'}")
    print("=" * 60 + "\n")

    cleaner.clean_captured_logs(log_dir, args.days, args.dry_run)

    print("\n✅ Cleanup complete")
    print("\n💡 Note: Frontend logs on production are stored in simulation logs")
    print("   and are cleaned by clean-backend-logs.py with 7-day retention.")


if __name__ == "__main__":
    main()
