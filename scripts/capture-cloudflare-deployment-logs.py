#!/usr/bin/env python3
"""
Capture Cloudflare Pages deployment logs via Cloudflare API.

This script fetches deployment logs from Cloudflare Pages for the TerrainSim
frontend deployments. It uses the Cloudflare API to retrieve deployment details
and logs, storing them locally for analysis.

Requirements:
    pip install requests

Environment Variables:
    CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID
    CLOUDFLARE_API_TOKEN - Cloudflare API token with Pages read access
    CLOUDFLARE_PROJECT_NAME - Cloudflare Pages project name (default: terrainsim)

Usage:
    # Capture latest deployment logs
    python scripts/capture-cloudflare-deployment-logs.py

    # Capture specific deployment
    python scripts/capture-cloudflare-deployment-logs.py --deployment-id <id>

    # Capture last N deployments
    python scripts/capture-cloudflare-deployment-logs.py --count 5

    # Specify output directory
    python scripts/capture-cloudflare-deployment-logs.py --output logs/captured/cloudflare
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

try:
    import requests
except ImportError:
    print("❌ Error: requests library not installed")
    print("Install with: pip install requests")
    sys.exit(1)


class CloudflareDeploymentLogCapture:
    """Capture Cloudflare Pages deployment logs."""

    def __init__(
        self,
        account_id: str,
        api_token: str,
        project_name: str = "terrainsim"
    ):
        """Initialize with Cloudflare credentials."""
        self.account_id = account_id
        self.api_token = api_token
        self.project_name = project_name
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def get_deployments(self, count: int = 10) -> List[Dict[str, Any]]:
        """Fetch recent deployments."""
        print(f"📥 Fetching last {count} deployments for {self.project_name}...")

        try:
            response = requests.get(
                f"{self.base_url}/deployments",
                headers=self.headers,
                params={"per_page": count},
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            deployments = data.get("result", [])

            print(f"✅ Found {len(deployments)} deployment(s)")
            return deployments

        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching deployments: {e}")
            return []

    def get_deployment_logs(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Fetch logs for a specific deployment."""
        print(f"📥 Fetching logs for deployment {deployment_id[:8]}...")

        try:
            # Get deployment details
            response = requests.get(
                f"{self.base_url}/deployments/{deployment_id}",
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()

            deployment = response.json().get("result", {})

            # Get build logs
            logs_url = f"{self.base_url}/deployments/{deployment_id}/history/logs"
            logs_response = requests.get(
                logs_url,
                headers=self.headers,
                timeout=30
            )

            if logs_response.status_code == 200:
                logs_data = logs_response.json()
                deployment["build_logs"] = logs_data.get("result", {})
            else:
                deployment["build_logs"] = None
                print(f"⚠️  Build logs not available (status: {logs_response.status_code})")

            return deployment

        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching deployment logs: {e}")
            return None

    def save_deployment_logs(
        self,
        deployment: Dict[str, Any],
        output_dir: Path
    ) -> Optional[Path]:
        """Save deployment logs to JSON file."""
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename with timestamp and deployment ID
        deployment_id = deployment.get("id", "unknown")
        created_on = deployment.get("created_on", "")

        try:
            timestamp = datetime.fromisoformat(created_on.replace("Z", "+00:00"))
            date_str = timestamp.strftime("%Y%m%d-%H%M%S")
        except (ValueError, AttributeError):
            date_str = datetime.now().strftime("%Y%m%d-%H%M%S")

        filename = f"cloudflare-deployment-{date_str}-{deployment_id[:8]}.json"
        filepath = output_dir / filename

        # Prepare deployment summary
        summary = {
            "captured_at": datetime.now().isoformat(),
            "deployment_id": deployment_id,
            "project_name": self.project_name,
            "created_on": created_on,
            "environment": deployment.get("environment", "unknown"),
            "deployment_trigger": deployment.get("deployment_trigger", {}),
            "latest_stage": deployment.get("latest_stage", {}),
            "build_config": deployment.get("build_config", {}),
            "source": deployment.get("source", {}),
            "url": deployment.get("url", ""),
            "aliases": deployment.get("aliases", []),
            "build_logs": deployment.get("build_logs", None),
            "full_deployment_data": deployment
        }

        # Write to file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        print(f"💾 Saved deployment logs to: {filepath}")
        return filepath

    def print_deployment_summary(self, deployment: Dict[str, Any]) -> None:
        """Print a summary of the deployment."""
        deployment_id = deployment.get("id", "N/A")[:8]
        created_on = deployment.get("created_on", "N/A")
        environment = deployment.get("environment", "N/A")
        stage = deployment.get("latest_stage", {})
        stage_name = stage.get("name", "N/A")
        stage_status = stage.get("status", "N/A")
        url = deployment.get("url", "N/A")

        print("\n" + "=" * 60)
        print("📦 Deployment Summary")
        print("=" * 60)
        print(f"  ID:          {deployment_id}")
        print(f"  Created:     {created_on}")
        print(f"  Environment: {environment}")
        print(f"  Stage:       {stage_name}")
        print(f"  Status:      {stage_status}")
        print(f"  URL:         {url}")

        # Show commit info if available
        source = deployment.get("source", {})
        if source:
            commit_hash = source.get("config", {}).get("commit_hash", "")[:7]
            commit_message = source.get("config", {}).get("commit_message", "")
            branch = source.get("config", {}).get("branch", "")
            if commit_hash:
                print(f"  Commit:      {commit_hash} ({branch})")
                print(f"  Message:     {commit_message}")

        print("=" * 60 + "\n")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Capture Cloudflare Pages deployment logs"
    )
    parser.add_argument(
        "--deployment-id",
        type=str,
        help="Specific deployment ID to capture"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=1,
        help="Number of recent deployments to capture (default: 1)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="logs/captured/deployments/cloudflare",
        help="Output directory for captured logs"
    )
    parser.add_argument(
        "--project",
        type=str,
        default="terrainsim",
        help="Cloudflare Pages project name (default: terrainsim)"
    )

    args = parser.parse_args()

    # Get credentials from environment
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    project_name = os.getenv("CLOUDFLARE_PROJECT_NAME", args.project)

    if not account_id:
        print("❌ Error: CLOUDFLARE_ACCOUNT_ID environment variable not set")
        print("\nSet it with:")
        print("  export CLOUDFLARE_ACCOUNT_ID=<your-account-id>")
        sys.exit(1)

    if not api_token:
        print("❌ Error: CLOUDFLARE_API_TOKEN environment variable not set")
        print("\nSet it with:")
        print("  export CLOUDFLARE_API_TOKEN=<your-api-token>")
        sys.exit(1)

    # Initialize capture tool
    capture = CloudflareDeploymentLogCapture(
        account_id=account_id,
        api_token=api_token,
        project_name=project_name
    )

    output_dir = Path(args.output)

    print("=" * 60)
    print("☁️  Cloudflare Pages Deployment Log Capture")
    print("=" * 60)
    print(f"  Project:     {project_name}")
    print(f"  Account ID:  {account_id[:8]}...")
    print(f"  Output Dir:  {output_dir}")
    print("=" * 60 + "\n")

    # Capture specific deployment or recent deployments
    if args.deployment_id:
        deployment = capture.get_deployment_logs(args.deployment_id)
        if deployment:
            capture.print_deployment_summary(deployment)
            capture.save_deployment_logs(deployment, output_dir)
            print("\n✅ Deployment log captured successfully")
        else:
            print("\n❌ Failed to capture deployment log")
            sys.exit(1)
    else:
        # Capture recent deployments
        deployments = capture.get_deployments(args.count)

        if not deployments:
            print("\n❌ No deployments found")
            sys.exit(1)

        captured_count = 0
        for deployment_summary in deployments:
            deployment_id = deployment_summary.get("id")
            if not deployment_id:
                continue

            # Fetch full deployment details with logs
            deployment = capture.get_deployment_logs(deployment_id)
            if deployment:
                capture.print_deployment_summary(deployment)
                capture.save_deployment_logs(deployment, output_dir)
                captured_count += 1
                print()

        print(f"\n✅ Captured {captured_count}/{len(deployments)} deployment log(s)")

    print(f"\n📂 Logs saved to: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
