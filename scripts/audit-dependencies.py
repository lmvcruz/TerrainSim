#!/usr/bin/env python3
"""
Dependency Audit Script
Analyzes pnpm workspaces for unused dependencies and generates a comprehensive report.

Usage:
    python scripts/audit-dependencies.py
    python scripts/audit-dependencies.py --verbose
    python scripts/audit-dependencies.py --output custom-report.md
"""

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple


@dataclass
class DependencyInfo:
    """Information about a single dependency."""
    name: str
    version: str
    is_dev: bool
    used: bool = False
    usage_locations: List[str] = field(default_factory=list)
    usage_reason: str = ""


@dataclass
class WorkspaceInfo:
    """Information about a workspace package."""
    name: str
    path: Path
    dependencies: List[DependencyInfo] = field(default_factory=list)
    dev_dependencies: List[DependencyInfo] = field(default_factory=list)


class DependencyAuditor:
    """Main class for auditing dependencies across pnpm workspaces."""

    def __init__(self, project_root: Path, verbose: bool = False):
        self.project_root = project_root
        self.verbose = verbose
        self.workspaces: List[WorkspaceInfo] = []

        # Common patterns for dependency usage
        self.import_patterns = [
            r'import\s+.*?from\s+[\'"]({package})[\'"]',
            r'import\s+[\'"]({package})[\'"]',
            r'require\([\'"]({package}[\'"]\))',
        ]

        # Special cases: dependencies used implicitly
        self.implicit_usage = {
            'typescript': 'TypeScript compiler',
            'vite': 'Build tool',
            'vitest': 'Test runner',
            'eslint': 'Linting',
            'playwright': 'E2E testing',
            '@playwright/test': 'E2E testing',
            'tailwindcss': 'Styling framework',
            'postcss': 'CSS processing (via Tailwind)',
            'autoprefixer': 'CSS vendor prefixes (via PostCSS)',
            'jsdom': 'Vitest test environment',
            'tsx': 'TypeScript execution',
            'cmake-js': 'Native addon build system',
            'node-addon-api': 'Native addon API',
        }

        # Config files where dependencies might be referenced
        self.config_files = [
            'vite.config.ts', 'vite.config.js',
            'vitest.config.ts', 'vitest.config.js',
            'postcss.config.js', 'postcss.config.cjs',
            'tailwind.config.js', 'tailwind.config.ts',
            'eslint.config.js', 'eslint.config.mjs',
            '.eslintrc.js', '.eslintrc.json',
            'playwright.config.ts', 'playwright.config.js',
            'package.json',
        ]

    def log(self, message: str):
        """Print message if verbose mode is enabled."""
        if self.verbose:
            print(f"  {message}")

    def run_command(self, cmd: List[str], cwd: Path = None) -> Tuple[str, int]:
        """Run shell command and return output."""
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.project_root,
                capture_output=True,
                text=True,
                shell=True
            )
            return result.stdout, result.returncode
        except Exception as e:
            print(f"Error running command {' '.join(cmd)}: {e}")
            return "", 1

    def find_package_json_files(self) -> List[Path]:
        """Find all package.json files in the project (excluding node_modules)."""
        package_files = []
        for root, dirs, files in os.walk(self.project_root):
            # Skip node_modules
            dirs[:] = [d for d in dirs if d != 'node_modules']

            if 'package.json' in files:
                package_files.append(Path(root) / 'package.json')

        return sorted(package_files)

    def parse_pnpm_list(self, output: str) -> Tuple[List[str], List[str]]:
        """Parse pnpm list output to extract dependencies and devDependencies."""
        dependencies = []
        dev_dependencies = []

        lines = output.split('\n')
        current_section = None

        for line in lines:
            if 'dependencies:' in line.lower() and 'dev' not in line.lower():
                current_section = 'prod'
            elif 'devdependencies:' in line.lower():
                current_section = 'dev'
            elif line.strip() and current_section:
                # Extract package name (format: "package-name version")
                match = re.match(r'^([a-z@][^\s]+)\s+', line.strip())
                if match:
                    pkg_name = match.group(1)
                    if current_section == 'prod':
                        dependencies.append(pkg_name)
                    else:
                        dev_dependencies.append(pkg_name)

        return dependencies, dev_dependencies

    def get_workspace_dependencies(self, workspace_path: Path) -> WorkspaceInfo:
        """Get dependencies for a specific workspace."""
        self.log(f"Analyzing workspace: {workspace_path.relative_to(self.project_root)}")

        # Read package.json to get workspace name
        package_json_path = workspace_path / 'package.json'
        with open(package_json_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)

        workspace_name = package_data.get('name', workspace_path.name)

        # Run pnpm list
        output, returncode = self.run_command(
            ['pnpm', 'list', '--depth', '0'],
            cwd=workspace_path
        )

        if returncode != 0:
            print(f"Warning: pnpm list failed for {workspace_path}")
            return WorkspaceInfo(name=workspace_name, path=workspace_path)

        # Parse dependencies
        prod_deps, dev_deps = self.parse_pnpm_list(output)

        workspace = WorkspaceInfo(name=workspace_name, path=workspace_path)

        # Extract versions from package.json
        pkg_deps = package_data.get('dependencies', {})
        pkg_dev_deps = package_data.get('devDependencies', {})

        for dep in prod_deps:
            version = pkg_deps.get(dep, 'unknown')
            workspace.dependencies.append(DependencyInfo(dep, version, False))

        for dep in dev_deps:
            version = pkg_dev_deps.get(dep, 'unknown')
            workspace.dev_dependencies.append(DependencyInfo(dep, version, True))

        return workspace

    def check_dependency_usage(self, dep: DependencyInfo, workspace: WorkspaceInfo):
        """Check if a dependency is used in the workspace."""
        dep_name = dep.name
        workspace_path = workspace.path

        # Check implicit usage first
        if dep_name in self.implicit_usage:
            dep.used = True
            dep.usage_reason = self.implicit_usage[dep_name]
            return

        # Check for @types/* packages
        if dep_name.startswith('@types/'):
            base_package = dep_name.replace('@types/', '')
            dep.used = True
            dep.usage_reason = f"TypeScript types for {base_package}"
            return

        # Check config files first
        for config_file in self.config_files:
            config_path = workspace_path / config_file
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if dep_name in content:
                        dep.used = True
                        dep.usage_locations.append(str(config_path.relative_to(self.project_root)))

        # Search for imports in source files
        source_extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
        src_dirs = ['src', 'tests', 'test', 'e2e']

        for src_dir in src_dirs:
            src_path = workspace_path / src_dir
            if not src_path.exists():
                continue

            for root, _, files in os.walk(src_path):
                for file in files:
                    if not any(file.endswith(ext) for ext in source_extensions):
                        continue

                    file_path = Path(root) / file
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                            # Escape special regex characters in package name
                            escaped_name = re.escape(dep_name)

                            # Check various import patterns
                            for pattern_template in self.import_patterns:
                                pattern = pattern_template.format(package=escaped_name)
                                if re.search(pattern, content):
                                    dep.used = True
                                    rel_path = file_path.relative_to(self.project_root)
                                    if str(rel_path) not in dep.usage_locations:
                                        dep.usage_locations.append(str(rel_path))
                    except Exception as e:
                        self.log(f"Error reading {file_path}: {e}")

    def audit_workspaces(self):
        """Audit all workspaces in the project."""
        print("🔍 Scanning for package.json files...")
        package_files = self.find_package_json_files()

        print(f"Found {len(package_files)} workspace(s)")
        print()

        for package_file in package_files:
            workspace_path = package_file.parent
            workspace = self.get_workspace_dependencies(workspace_path)

            # Check usage for each dependency
            all_deps = workspace.dependencies + workspace.dev_dependencies
            for dep in all_deps:
                self.check_dependency_usage(dep, workspace)

            self.workspaces.append(workspace)
            print(f"✓ Analyzed {workspace.name}")

        print()

    def generate_report(self, output_file: Path):
        """Generate markdown report."""
        report_lines = []

        # Header
        report_lines.extend([
            "# Dependency Audit Report",
            "",
            f"**Date:** {datetime.now().strftime('%Y-%m-%d')}",
            f"**Generated by:** scripts/audit-dependencies.py",
            "",
            "---",
            "",
            "## Summary",
            "",
        ])

        # Calculate totals
        total_prod = sum(len(ws.dependencies) for ws in self.workspaces)
        total_dev = sum(len(ws.dev_dependencies) for ws in self.workspaces)
        total = total_prod + total_dev

        unused_deps = []
        for ws in self.workspaces:
            for dep in ws.dependencies + ws.dev_dependencies:
                if not dep.used:
                    unused_deps.append((ws.name, dep))

        report_lines.extend([
            f"- **Total packages audited:** {len(self.workspaces)} workspaces",
            f"- **Total dependencies:** {total} ({total_prod} production, {total_dev} dev)",
            f"- **Unused dependencies found:** {len(unused_deps)}",
            f"- **Status:** {'✅ Clean' if len(unused_deps) == 0 else '⚠️ Needs cleanup'}",
            "",
            "---",
            "",
        ])

        # Workspace details
        for workspace in self.workspaces:
            report_lines.extend([
                f"## Workspace: {workspace.name}",
                "",
                f"**Path:** `{workspace.path.relative_to(self.project_root)}`",
                "",
            ])

            # Production dependencies
            if workspace.dependencies:
                report_lines.append("### Production Dependencies")
                report_lines.append("")
                for dep in sorted(workspace.dependencies, key=lambda d: d.name):
                    status = "✅ USED" if dep.used else "❌ UNUSED"
                    reason = f" - {dep.usage_reason}" if dep.usage_reason else ""
                    locations = ""
                    if dep.usage_locations and not dep.usage_reason:
                        locations = f" ({', '.join(dep.usage_locations[:2])})"
                        if len(dep.usage_locations) > 2:
                            locations += f" +{len(dep.usage_locations) - 2} more"

                    report_lines.append(f"- `{dep.name}@{dep.version}` - {status}{reason}{locations}")
                report_lines.append("")

            # Dev dependencies
            if workspace.dev_dependencies:
                report_lines.append("### Dev Dependencies")
                report_lines.append("")
                for dep in sorted(workspace.dev_dependencies, key=lambda d: d.name):
                    status = "✅ USED" if dep.used else "❌ UNUSED"
                    reason = f" - {dep.usage_reason}" if dep.usage_reason else ""
                    locations = ""
                    if dep.usage_locations and not dep.usage_reason:
                        locations = f" ({', '.join(dep.usage_locations[:2])})"
                        if len(dep.usage_locations) > 2:
                            locations += f" +{len(dep.usage_locations) - 2} more"

                    report_lines.append(f"- `{dep.name}@{dep.version}` - {status}{reason}{locations}")
                report_lines.append("")

            report_lines.append("---")
            report_lines.append("")

        # Unused dependencies section
        if unused_deps:
            report_lines.extend([
                "## ⚠️ Unused Dependencies",
                "",
                "The following dependencies are not used and can be removed:",
                "",
            ])

            for ws_name, dep in unused_deps:
                dep_type = "devDependency" if dep.is_dev else "dependency"
                report_lines.append(
                    f"- **{dep.name}** in `{ws_name}` ({dep_type})"
                )

            report_lines.extend([
                "",
                "### Removal Commands",
                "",
                "```bash",
            ])

            # Group by workspace
            deps_by_workspace: Dict[str, List[str]] = {}
            for ws_name, dep in unused_deps:
                if ws_name not in deps_by_workspace:
                    deps_by_workspace[ws_name] = []
                deps_by_workspace[ws_name].append(dep.name)

            for ws_name, deps in deps_by_workspace.items():
                ws = next(w for w in self.workspaces if w.name == ws_name)
                rel_path = ws.path.relative_to(self.project_root)
                report_lines.append(f"# {ws_name}")
                report_lines.append(f"cd {rel_path}")
                report_lines.append(f"pnpm remove {' '.join(deps)}")
                report_lines.append("")

            report_lines.extend([
                "```",
                "",
                "---",
                "",
            ])

        # Metrics table
        report_lines.extend([
            "## Metrics",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Total workspaces | {len(self.workspaces)} |",
            f"| Total dependencies (prod) | {total_prod} |",
            f"| Total dependencies (dev) | {total_dev} |",
            f"| Unused dependencies | {len(unused_deps)} |",
            f"| Dependency efficiency | {((total - len(unused_deps)) / total * 100):.1f}% |",
            "",
            "---",
            "",
        ])

        # Recommendations
        report_lines.extend([
            "## Recommendations",
            "",
            "### Current Actions",
            "",
        ])

        if unused_deps:
            report_lines.append("1. ⚠️ Remove unused dependencies listed above")
            report_lines.append("2. Run tests to ensure nothing breaks")
            report_lines.append("3. Commit changes with descriptive message")
        else:
            report_lines.append("✅ No action needed - all dependencies are actively used")

        report_lines.extend([
            "",
            "### Future Maintenance",
            "",
            "1. **Regular Audits:** Run this script quarterly or after major features",
            "2. **Before Adding Deps:** Verify necessity and check for alternatives",
            "3. **Security Updates:** Run `pnpm audit` regularly",
            "4. **Bundle Analysis:** Monitor frontend bundle size with build tools",
            "",
            "---",
            "",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Status:** {'✅ Clean' if len(unused_deps) == 0 else '⚠️ Action Required'}",
        ])

        # Write report
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report_lines))

        print(f"📄 Report generated: {output_file}")

        # Summary output
        print()
        print("=" * 60)
        print("AUDIT SUMMARY")
        print("=" * 60)
        print(f"Total dependencies: {total}")
        print(f"Unused dependencies: {len(unused_deps)}")
        if unused_deps:
            print()
            print("⚠️  Unused dependencies found:")
            for ws_name, dep in unused_deps:
                print(f"  - {dep.name} (in {ws_name})")
        else:
            print()
            print("✅ All dependencies are actively used!")
        print("=" * 60)

        return len(unused_deps)


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Audit pnpm workspace dependencies for unused packages'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='docs/temp/DEPENDENCY_AUDIT_{date}.md',
        help='Output report file path (use {date} for current date)'
    )

    args = parser.parse_args()

    # Resolve project root (script is in scripts/ folder)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    print("🔍 TerrainSim Dependency Audit")
    print(f"📁 Project root: {project_root}")
    print()

    # Generate output filename
    output_path = args.output.format(date=datetime.now().strftime('%Y-%m-%d'))
    output_file = project_root / output_path

    # Run audit
    auditor = DependencyAuditor(project_root, verbose=args.verbose)
    auditor.audit_workspaces()
    unused_count = auditor.generate_report(output_file)

    # Exit code: 0 if clean, 1 if unused deps found
    sys.exit(1 if unused_count > 0 else 0)


if __name__ == '__main__':
    main()
