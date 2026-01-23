#!/usr/bin/env python3
"""
Filter and search logs using the backend log filtering API.

This script queries the backend API to filter logs by various criteria:
- Log level (trace, debug, info, warn, error)
- Source (frontend, backend)
- Date range
- Session ID
- Search term

Requires the backend log filtering API to be running.

Usage:
    # Filter production logs by level
    python scripts/filter-logs.py production level error

    # Filter local logs by source
    python scripts/filter-logs.py local source frontend

    # Search logs for term
    python scripts/filter-logs.py production search "terrain generation"

    # Filter by session ID
    python scripts/filter-logs.py production session session-1234567890

    # Specify result limit
    python scripts/filter-logs.py production level warn --limit 100

    # Save results to file
    python scripts/filter-logs.py production level error --output errors.json
"""

import sys
import json
import argparse
from typing import Optional

try:
    import requests
except ImportError:
    print("❌ Error: requests library not installed")
    print("Install with: pip install requests")
    sys.exit(1)


class LogFilter:
    """Filter logs using backend API."""

    def __init__(self, api_url: str):
        """Initialize with API base URL."""
        self.api_url = api_url
        self.filter_endpoint = f"{api_url}/api/logs/filter"

    def filter_logs(
        self,
        filter_params: dict,
        limit: int = 500
    ) -> Optional[dict]:
        """Query logs with filters."""
        params = {**filter_params, "limit": limit}

        try:
            print(f"🔍 Filtering logs...")
            print(f"  API: {self.filter_endpoint}")
            print(f"  Filters: {json.dumps(filter_params, indent=2)}")
            print(f"  Limit: {limit}\n")

            response = requests.get(
                self.filter_endpoint,
                params=params,
                timeout=30
            )

            response.raise_for_status()
            return response.json()

        except requests.exceptions.ConnectionError:
            print(f"❌ Error: Could not connect to API at {self.api_url}")
            print("   Make sure the backend is running")
            return None
        except requests.exceptions.Timeout:
            print("❌ Error: Request timed out")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"❌ HTTP Error: {e}")
            print(f"   Response: {e.response.text if e.response else 'No response'}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {e}")
            return None

    def print_results(self, data: dict, show_full: bool = False) -> None:
        """Print filtered log results."""
        count = data.get("count", 0)
        logs = data.get("logs", [])

        print("=" * 80)
        print(f"📊 Filter Results: {count} log(s) found")
        print("=" * 80)

        if count == 0:
            print("\nNo logs match the filter criteria")
            return

        for i, log in enumerate(logs, 1):
            level = log.get("level", "unknown").upper()
            timestamp = log.get("timestamp", "")
            message = log.get("message", "")
            source = log.get("source", "backend")

            # Color codes for levels
            level_colors = {
                "ERROR": "\033[91m",  # Red
                "WARN": "\033[93m",   # Yellow
                "INFO": "\033[92m",   # Green
                "DEBUG": "\033[94m",  # Blue
                "TRACE": "\033[90m"   # Gray
            }
            reset = "\033[0m"
            color = level_colors.get(level, "")

            print(f"\n{i}. {color}[{level}]{reset} {timestamp}")
            print(f"   Source: {source}")
            print(f"   Message: {message}")

            if show_full:
                # Show additional fields
                for key, value in log.items():
                    if key not in ["level", "timestamp", "message", "source"]:
                        print(f"   {key}: {value}")

        print("\n" + "=" * 80)

    def save_results(self, data: dict, output_file: str) -> None:
        """Save results to JSON file."""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Results saved to: {output_file}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Filter and search logs via backend API"
    )
    parser.add_argument(
        "environment",
        choices=["production", "local"],
        help="Environment (production or local)"
    )
    parser.add_argument(
        "filter_type",
        choices=["level", "source", "search", "session", "date"],
        help="Filter type"
    )
    parser.add_argument(
        "filter_value",
        help="Filter value (e.g., 'error' for level, 'frontend' for source)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=500,
        help="Maximum number of results (default: 500)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Save results to JSON file"
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Show all log fields (verbose output)"
    )

    args = parser.parse_args()

    # Determine API URL
    if args.environment == "production":
        api_url = "https://api.lmvcruz.work"
    else:
        api_url = "http://localhost:3001"

    # Build filter parameters
    filter_params = {}

    if args.filter_type == "level":
        filter_params["level"] = args.filter_value
    elif args.filter_type == "source":
        filter_params["source"] = args.filter_value
    elif args.filter_type == "search":
        filter_params["searchTerm"] = args.filter_value
    elif args.filter_type == "session":
        filter_params["sessionId"] = args.filter_value
    elif args.filter_type == "date":
        # Assume filter_value is start date, could be enhanced
        filter_params["startDate"] = args.filter_value

    # Create filter and execute
    log_filter = LogFilter(api_url)

    print("=" * 80)
    print("🔍 Log Filter")
    print("=" * 80)
    print(f"  Environment: {args.environment}")
    print(f"  Filter Type: {args.filter_type}")
    print(f"  Filter Value: {args.filter_value}")
    print(f"  Result Limit: {args.limit}")
    print("=" * 80 + "\n")

    data = log_filter.filter_logs(filter_params, args.limit)

    if data:
        log_filter.print_results(data, show_full=args.full)

        if args.output:
            log_filter.save_results(data, args.output)

        print(f"\n✅ Filter complete: {data.get('count', 0)} result(s)")
    else:
        print("\n❌ Filter failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
