#!/usr/bin/env python3
"""
Set log level for backend or frontend components dynamically.

This script updates log level configuration in .env files and optionally
restarts services to apply changes. For production backend, it can update
the .env file and restart PM2 via SSH.

Valid log levels: trace, debug, info, warn, error

Usage:
    # Set backend log level in production
    python scripts/set-log-level.py production backend info

    # Set frontend log level in development
    python scripts/set-log-level.py local frontend debug

    # Set backend log level without restart
    python scripts/set-log-level.py production backend debug --no-restart
"""

import sys
import subprocess
import re
import argparse
from pathlib import Path
from typing import Optional


class LogLevelManager:
    """Manage log level configuration."""

    def __init__(self, server: str = "ubuntu@54.242.131.12"):
        """Initialize with server connection info."""
        self.server = server
        self.valid_levels = ["trace", "debug", "info", "warn", "error"]

    def run_ssh_command(self, command: str) -> tuple[str, str, int]:
        """Execute command on remote server via SSH."""
        result = subprocess.run(
            ["ssh", "-o", "StrictHostKeyChecking=no", self.server, command],
            capture_output=True,
            text=True
        )
        return result.stdout, result.stderr, result.returncode

    def update_env_file(
        self,
        file_path: Path,
        key: str,
        value: str
    ) -> bool:
        """Update environment variable in .env file."""
        if not file_path.exists():
            print(f"⚠️  File not found: {file_path}")
            return False

        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update or add the key
        pattern = rf'^{re.escape(key)}=.*$'
        replacement = f'{key}={value}'

        if re.search(pattern, content, re.MULTILINE):
            # Update existing
            new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
            action = "Updated"
        else:
            # Add new
            new_content = content.rstrip() + f'\n{replacement}\n'
            action = "Added"

        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"  ✅ {action} {key}={value} in {file_path}")
        return True

    def set_backend_log_level(
        self,
        environment: str,
        log_level: str,
        restart: bool = True
    ) -> None:
        """Set backend log level."""
        print(f"🔧 Setting backend log level to '{log_level}' ({environment})...\n")

        if environment == "production":
            # Update on production server via SSH
            update_script = f'''
cd /var/www/terrainsim

echo "📝 Current LOG_LEVEL:"
grep LOG_LEVEL .env || echo "  (not set)"

echo ""
echo "📝 Updating LOG_LEVEL to {log_level}..."
sed -i 's/^LOG_LEVEL=.*/LOG_LEVEL={log_level}/' .env

# Add if doesn't exist
if ! grep -q "^LOG_LEVEL=" .env; then
    echo "LOG_LEVEL={log_level}" >> .env
fi

echo "  ✅ Updated LOG_LEVEL={log_level}"

echo ""
echo "📝 New LOG_LEVEL:"
grep LOG_LEVEL .env
'''

            stdout, stderr, code = self.run_ssh_command(update_script)

            if code == 0:
                print(stdout)

                if restart:
                    print("\n🔄 Restarting PM2...")
                    restart_cmd = "cd /var/www/terrainsim && pm2 restart terrainsim-api"
                    stdout, stderr, code = self.run_ssh_command(restart_cmd)

                    if code == 0:
                        print("  ✅ PM2 restarted successfully")
                    else:
                        print(f"  ❌ Error restarting PM2: {stderr}")
                else:
                    print("\n⚠️  Backend not restarted. Restart manually to apply changes:")
                    print("   ssh ubuntu@54.242.131.12 'cd /var/www/terrainsim && pm2 restart terrainsim-api'")
            else:
                print(f"❌ Error updating log level: {stderr}")

        else:
            # Update local .env file
            env_file = Path("apps/simulation-api/.env")

            if not env_file.exists():
                env_file = Path("apps/simulation-api/.env.development")

            if self.update_env_file(env_file, "LOG_LEVEL", log_level):
                if restart:
                    print("\n⚠️  Local backend needs manual restart to apply changes")
                    print("   Run: pnpm --filter simulation-api dev")
                else:
                    print("\n💡 Restart backend to apply changes")

    def set_frontend_log_level(
        self,
        environment: str,
        log_level: str
    ) -> None:
        """Set frontend log level."""
        print(f"🌐 Setting frontend log level to '{log_level}' ({environment})...\n")

        if environment == "production":
            env_file = Path("apps/web/.env.production")
        else:
            env_file = Path("apps/web/.env.development")

        if self.update_env_file(env_file, "VITE_LOG_LEVEL", log_level):
            print("\n💡 Frontend needs rebuild to apply changes:")
            if environment == "production":
                print("   Deploy frontend or push to main branch to trigger deployment")
            else:
                print("   Restart dev server: pnpm --filter web dev")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Set log level for backend or frontend"
    )
    parser.add_argument(
        "environment",
        choices=["production", "local"],
        help="Environment (production or local)"
    )
    parser.add_argument(
        "component",
        choices=["backend", "frontend"],
        help="Component (backend or frontend)"
    )
    parser.add_argument(
        "level",
        choices=["trace", "debug", "info", "warn", "error"],
        help="Log level"
    )
    parser.add_argument(
        "--no-restart",
        action="store_true",
        help="Don't restart service after updating (backend only)"
    )

    args = parser.parse_args()

    manager = LogLevelManager()

    print("=" * 60)
    print("📊 Log Level Configuration")
    print("=" * 60)
    print(f"  Environment: {args.environment}")
    print(f"  Component:   {args.component}")
    print(f"  Log Level:   {args.level}")
    print(f"  Auto-restart: {not args.no_restart}")
    print("=" * 60 + "\n")

    if args.component == "backend":
        manager.set_backend_log_level(
            args.environment,
            args.level,
            restart=not args.no_restart
        )
    elif args.component == "frontend":
        manager.set_frontend_log_level(args.environment, args.level)

    print("\n✅ Log level configuration updated")


if __name__ == "__main__":
    main()
