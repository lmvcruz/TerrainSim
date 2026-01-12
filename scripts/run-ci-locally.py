#!/usr/bin/env python3
"""
Run CI steps locally - mimics GitHub Actions CI/CD pipeline

This script runs the same steps as the GitHub Actions workflows:
1. test-frontend (CI)
2. test-backend (CI)
3. build (Deploy)
4. deploy (Deploy - dry run only)

Usage:
    python scripts/run-ci-locally.py                    # Run all steps
    python scripts/run-ci-locally.py --steps 1,2        # Run specific steps
    python scripts/run-ci-locally.py --skip-backend     # Skip backend tests
    python scripts/run-ci-locally.py --verbose          # Show detailed output
"""

import argparse
import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import List, Optional


class Colors:
    """ANSI color codes for terminal output"""
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    GRAY = '\033[90m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

    @staticmethod
    def is_supported() -> bool:
        """Check if terminal supports colors"""
        return (
            sys.stdout.isatty() and
            (platform.system() != 'Windows' or 'ANSICON' in os.environ or
             'WT_SESSION' in os.environ or 'TERM_PROGRAM' in os.environ)
        )


class CIRunner:
    """Runs CI steps locally to mimic GitHub Actions behavior"""

    def __init__(self, workspace_root: Path, verbose: bool = False):
        self.workspace_root = workspace_root
        self.verbose = verbose
        self.colors_enabled = Colors.is_supported()

    def _colorize(self, text: str, color: str) -> str:
        """Apply color to text if colors are enabled"""
        if self.colors_enabled:
            return f"{color}{text}{Colors.RESET}"
        return text

    def _print_header(self, text: str):
        """Print a colored header"""
        print(f"\n{self._colorize(text, Colors.CYAN + Colors.BOLD)}")

    def _print_step(self, step_num: int, total: int, text: str):
        """Print a step indicator"""
        print(f"\n{self._colorize(f'[{step_num}/{total}] {text}', Colors.YELLOW)}")
        print(self._colorize('-' * 60, Colors.GRAY))

    def _print_success(self, text: str):
        """Print a success message"""
        print(self._colorize(f"✅ {text}", Colors.GREEN))

    def _print_error(self, text: str):
        """Print an error message"""
        print(self._colorize(f"❌ {text}", Colors.RED))

    def _run_command(
        self,
        command: List[str],
        cwd: Optional[Path] = None,
        check: bool = True,
        env: Optional[dict] = None
    ) -> subprocess.CompletedProcess:
        """
        Run a shell command and handle errors

        Args:
            command: Command and arguments as list
            cwd: Working directory (defaults to workspace root)
            check: Whether to raise exception on non-zero exit code
            env: Environment variables to pass to the command

        Returns:
            CompletedProcess instance
        """
        if cwd is None:
            cwd = self.workspace_root

        if self.verbose:
            cmd_str = ' '.join(command)
            print(self._colorize(f"Running: {cmd_str}", Colors.GRAY))
            print(self._colorize(f"Working directory: {cwd}", Colors.GRAY))

        # On Windows, use shell=True for better command resolution
        use_shell = platform.system() == 'Windows'

        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                capture_output=not self.verbose,
                text=True,
                check=check,
                shell=use_shell,
                env=env
            )
            return result
        except subprocess.CalledProcessError as e:
            if not self.verbose and e.stdout:
                print(e.stdout)
            if not self.verbose and e.stderr:
                print(e.stderr, file=sys.stderr)
            raise

    def _check_command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH"""
        try:
            # On Windows, try both .cmd and .exe extensions
            if platform.system() == 'Windows':
                # Try with shell=True to let Windows find the right executable
                subprocess.run(
                    f'{command} --version',
                    capture_output=True,
                    check=True,
                    shell=True
                )
            else:
                subprocess.run(
                    [command, '--version'],
                    capture_output=True,
                    check=True
                )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def step_test_frontend(self) -> bool:
        """
        Step 1: Test Frontend (CI workflow)
        - TypeScript type checking
        - Vitest unit tests
        """
        self._print_step(1, 4, "Test Frontend")

        try:
            # Check if pnpm is installed
            if not self._check_command_exists('pnpm'):
                self._print_error("pnpm is not installed. Please install it first.")
                return False

            # TypeScript type checking
            print("Running TypeScript type check...")
            self._run_command(['pnpm', '--filter', '@terrain/web', 'run', 'typecheck'])
            self._print_success("TypeScript type check passed")

            # Run Vitest
            print("\nRunning Vitest unit tests...")
            self._run_command(['pnpm', '--filter', '@terrain/web', 'run', 'test'])
            self._print_success("Frontend tests passed")

            return True

        except subprocess.CalledProcessError:
            self._print_error("Frontend tests failed!")
            return False

    def step_test_backend(self) -> bool:
        """
        Step 2: Test Backend (CI workflow)
        - Configure CMake
        - Build C++ core library
        - Run CTest
        """
        self._print_step(2, 4, "Test Backend (C++ Core)")

        try:
            # Check if CMake is installed
            if not self._check_command_exists('cmake'):
                self._print_error("CMake is not installed. Please install it first.")
                return False

            core_dir = self.workspace_root / 'libs' / 'core'
            build_dir = core_dir / 'build'

            # Configure CMake
            print("Configuring CMake...")
            self._run_command([
                'cmake',
                '-S', str(core_dir),
                '-B', str(build_dir),
                '-DCMAKE_BUILD_TYPE=Release'
            ])
            self._print_success("CMake configuration successful")

            # Build C++ core
            print("\nBuilding C++ core library...")
            self._run_command([
                'cmake',
                '--build', str(build_dir),
                '--config', 'Release'
            ])
            self._print_success("C++ build successful")

            # Run CTest
            print("\nRunning C++ tests...")
            self._run_command(
                ['ctest', '--output-on-failure', '-C', 'Release'],
                cwd=build_dir
            )
            self._print_success("Backend tests passed")

            return True

        except subprocess.CalledProcessError:
            self._print_error("Backend tests failed!")
            return False

    def step_build(self) -> bool:
        """
        Step 3: Build (Deploy workflow)
        - Install dependencies
        - Build web app for production
        """
        self._print_step(3, 4, "Build Web App")

        try:
            # Check if pnpm is installed
            if not self._check_command_exists('pnpm'):
                self._print_error("pnpm is not installed. Please install it first.")
                return False

            # Install dependencies (if needed)
            print("Ensuring dependencies are installed...")
            self._run_command(['pnpm', 'install'])
            self._print_success("Dependencies installed")

            # Build web app
            print("\nBuilding web app for production...")
            build_env = os.environ.copy()
            build_env['BASE_PATH'] = '/TerrainSim'

            self._run_command(
                ['pnpm', '--filter', '@terrain/web', 'run', 'build'],
                env=build_env
            )
            self._print_success("Web app build successful")

            # Check if dist directory was created
            dist_dir = self.workspace_root / 'apps' / 'web' / 'dist'
            if not dist_dir.exists():
                self._print_error(f"Build output directory not found: {dist_dir}")
                return False

            print(f"Build output: {dist_dir}")
            return True

        except subprocess.CalledProcessError:
            self._print_error("Build failed!")
            return False

    def step_deploy_check(self) -> bool:
        """
        Step 4: Deploy Check (Deploy workflow - dry run)
        - Verify build artifacts exist
        - Show what would be deployed
        """
        self._print_step(4, 4, "Deploy Check (Dry Run)")

        try:
            dist_dir = self.workspace_root / 'apps' / 'web' / 'dist'

            # Verify dist directory exists
            if not dist_dir.exists():
                self._print_error(f"Dist directory not found: {dist_dir}")
                print("Run the build step first (step 3)")
                return False

            # List contents
            print("Build artifacts ready for deployment:")
            files = list(dist_dir.rglob('*'))
            if files:
                for file in sorted(files):
                    if file.is_file():
                        rel_path = file.relative_to(dist_dir)
                        size = file.stat().st_size
                        print(f"  - {rel_path} ({size:,} bytes)")
            else:
                self._print_error("No files found in dist directory")
                return False

            self._print_success("Deploy check passed")
            print(self._colorize(
                "\n📦 In GitHub Actions, these files would be deployed to GitHub Pages",
                Colors.GRAY
            ))

            return True

        except Exception as e:
            self._print_error(f"Deploy check failed: {e}")
            return False

    def run_all_steps(self, steps: Optional[List[int]] = None, skip_backend: bool = False) -> bool:
        """
        Run all CI steps or specific steps

        Args:
            steps: List of step numbers to run (1-4), or None for all
            skip_backend: Skip backend tests (useful if C++ compiler not available)

        Returns:
            True if all steps passed, False otherwise
        """
        self._print_header("=== TerrainSim CI - Local Execution ===")
        print(self._colorize("Running the same steps as GitHub Actions CI/CD...\n", Colors.GRAY))

        step_functions = {
            1: ("Test Frontend", self.step_test_frontend),
            2: ("Test Backend", self.step_test_backend),
            3: ("Build", self.step_build),
            4: ("Deploy Check", self.step_deploy_check),
        }

        # Determine which steps to run
        if steps is None:
            steps_to_run = [1, 2, 3, 4]
        else:
            steps_to_run = steps

        if skip_backend and 2 in steps_to_run:
            steps_to_run.remove(2)
            print(self._colorize("⚠️  Skipping backend tests (--skip-backend)\n", Colors.YELLOW))

        # Run steps
        results = {}
        for step_num in steps_to_run:
            if step_num not in step_functions:
                print(self._colorize(f"Invalid step number: {step_num}", Colors.RED))
                continue

            step_name, step_func = step_functions[step_num]
            success = step_func()
            results[step_num] = success

            if not success:
                print(f"\n{self._colorize('=== ❌ CI checks failed! ===', Colors.RED)}")
                print(self._colorize(f"Step {step_num} ({step_name}) failed.", Colors.RED))
                return False

        # All steps passed
        print(f"\n{self._colorize('=== ✨ All CI checks passed! ===', Colors.GREEN + Colors.BOLD)}")
        print(self._colorize("Your code is ready to push.\n", Colors.GRAY))
        return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Run CI steps locally to mimic GitHub Actions',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/run-ci-locally.py                    # Run all steps
  python scripts/run-ci-locally.py --steps 1,2        # Run steps 1 and 2 only
  python scripts/run-ci-locally.py --skip-backend     # Skip C++ backend tests
  python scripts/run-ci-locally.py --verbose          # Show detailed output

Steps:
  1. Test Frontend    - TypeScript check + Vitest
  2. Test Backend     - CMake + C++ build + CTest
  3. Build           - Production build of web app
  4. Deploy Check    - Verify build artifacts (dry run)
        """
    )

    parser.add_argument(
        '--steps',
        type=str,
        help='Comma-separated list of steps to run (e.g., "1,2,3")',
        default=None
    )

    parser.add_argument(
        '--skip-backend',
        action='store_true',
        help='Skip backend tests (useful if C++ compiler not available)'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed command output'
    )

    args = parser.parse_args()

    # Determine workspace root (script is in scripts/ directory)
    script_dir = Path(__file__).parent
    workspace_root = script_dir.parent

    if not (workspace_root / 'package.json').exists():
        print(f"Error: Could not find workspace root. Expected: {workspace_root}")
        sys.exit(1)

    # Parse steps argument
    steps = None
    if args.steps:
        try:
            steps = [int(s.strip()) for s in args.steps.split(',')]
            # Validate step numbers
            if any(s < 1 or s > 4 for s in steps):
                print("Error: Step numbers must be between 1 and 4")
                sys.exit(1)
        except ValueError:
            print("Error: Invalid steps format. Use comma-separated numbers (e.g., '1,2,3')")
            sys.exit(1)

    # Create runner and execute
    runner = CIRunner(workspace_root, verbose=args.verbose)
    success = runner.run_all_steps(steps=steps, skip_backend=args.skip_backend)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
