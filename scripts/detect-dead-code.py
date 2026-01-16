#!/usr/bin/env python3
"""
Dead Code Detection Script for TerrainSim

Detects potential dead code in the repository:
- Commented-out code blocks (>5 lines)
- Unused exports in TypeScript files
- Potentially unused files (not imported anywhere)
- Large commented sections

Usage:
    python scripts/detect-dead-code.py [--verbose] [--output path/to/report.md]

Exit codes:
    0 - No dead code found
    1 - Dead code detected (see report)
    2 - Script error
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Set, Tuple
import re

class DeadCodeDetector:
    def __init__(self, repo_root: Path, verbose: bool = False):
        self.repo_root = repo_root
        self.verbose = verbose
        self.issues: List[Dict] = []
        
    def log(self, message: str):
        """Print message if verbose mode enabled"""
        if self.verbose:
            print(f"  {message}")
    
    def detect_commented_code_blocks(self) -> List[Dict]:
        """Detect large commented-out code blocks (>5 lines)"""
        self.log("Searching for commented-out code blocks...")
        
        commented_blocks = []
        
        # Search in apps/ directory
        search_dirs = [
            self.repo_root / "apps" / "web" / "src",
            self.repo_root / "apps" / "simulation-api" / "src"
        ]
        
        for search_dir in search_dirs:
            if not search_dir.exists():
                continue
                
            for file_path in search_dir.rglob("*.ts*"):
                # Skip test files and node_modules
                if "node_modules" in str(file_path) or ".test." in str(file_path):
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    
                    # Track consecutive commented lines
                    comment_start = None
                    consecutive_comments = []
                    
                    for i, line in enumerate(lines, 1):
                        stripped = line.strip()
                        
                        # Check if line is a comment
                        is_comment = (
                            stripped.startswith('//') and not stripped.startswith('///')  # Not JSDoc
                            or (stripped.startswith('/*') and not stripped.startswith('/**'))  # Not JSDoc block
                        )
                        
                        # Check if it looks like code (has keywords, operators, etc.)
                        looks_like_code = any(keyword in stripped for keyword in [
                            'const ', 'let ', 'var ', 'function ', 'import ', 'export ',
                            'if (', 'for (', 'while (', 'return ', '= ', '=> ', '.push(',
                            '.map(', '.filter(', 'console.', 'logger.'
                        ])
                        
                        if is_comment and looks_like_code:
                            if comment_start is None:
                                comment_start = i
                            consecutive_comments.append(line.rstrip())
                        else:
                            # End of comment block
                            if comment_start is not None and len(consecutive_comments) > 5:
                                commented_blocks.append({
                                    'file': str(file_path.relative_to(self.repo_root)),
                                    'start_line': comment_start,
                                    'end_line': i - 1,
                                    'line_count': len(consecutive_comments),
                                    'preview': '\n'.join(consecutive_comments[:3]) + '\n...'
                                })
                            comment_start = None
                            consecutive_comments = []
                    
                    # Check last block
                    if comment_start is not None and len(consecutive_comments) > 5:
                        commented_blocks.append({
                            'file': str(file_path.relative_to(self.repo_root)),
                            'start_line': comment_start,
                            'end_line': len(lines),
                            'line_count': len(consecutive_comments),
                            'preview': '\n'.join(consecutive_comments[:3]) + '\n...'
                        })
                        
                except Exception as e:
                    self.log(f"Error reading {file_path}: {e}")
        
        self.log(f"Found {len(commented_blocks)} large commented code blocks")
        return commented_blocks
    
    def detect_unused_exports(self) -> Dict[str, List[str]]:
        """Detect unused exports using ts-unused-exports"""
        self.log("Detecting unused exports...")
        
        unused_exports = {}
        
        # Check frontend
        frontend_config = self.repo_root / "apps" / "web" / "tsconfig.json"
        if frontend_config.exists():
            try:
                result = subprocess.run(
                    ["npx", "ts-unused-exports", str(frontend_config), "--excludePathsFromReport=test"],
                    cwd=self.repo_root,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode != 0 and result.stdout:
                    # Parse output
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if line.strip() and not line.startswith('Need to install'):
                            match = re.match(r'(.+?):\s*(.+)', line)
                            if match:
                                file_path = match.group(1).strip()
                                exports = match.group(2).strip()
                                unused_exports[file_path] = exports.split(', ')
                                
            except subprocess.TimeoutExpired:
                self.log("Frontend unused exports check timed out")
            except Exception as e:
                self.log(f"Error checking frontend exports: {e}")
        
        # Check backend
        backend_config = self.repo_root / "apps" / "simulation-api" / "tsconfig.json"
        if backend_config.exists():
            try:
                result = subprocess.run(
                    ["npx", "ts-unused-exports", str(backend_config), "--excludePathsFromReport=test"],
                    cwd=self.repo_root,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode != 0 and result.stdout:
                    # Parse output
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if line.strip() and not line.startswith('Need to install'):
                            match = re.match(r'(.+?):\s*(.+)', line)
                            if match:
                                file_path = match.group(1).strip()
                                exports = match.group(2).strip()
                                unused_exports[file_path] = exports.split(', ')
                                
            except subprocess.TimeoutExpired:
                self.log("Backend unused exports check timed out")
            except Exception as e:
                self.log(f"Error checking backend exports: {e}")
        
        self.log(f"Found {len(unused_exports)} files with unused exports")
        return unused_exports
    
    def detect_potentially_unused_files(self) -> List[Dict]:
        """Detect files that are never imported"""
        self.log("Detecting potentially unused files...")
        
        unused_files = []
        
        # Get all TypeScript source files
        search_dirs = [
            self.repo_root / "apps" / "web" / "src",
            self.repo_root / "apps" / "simulation-api" / "src"
        ]
        
        all_files: Set[Path] = set()
        for search_dir in search_dirs:
            if search_dir.exists():
                for file_path in search_dir.rglob("*.ts*"):
                    if "node_modules" not in str(file_path):
                        all_files.add(file_path)
        
        # Files that should be excluded from unused check
        exclude_patterns = [
            'main.tsx',  # Entry point
            'index.ts',  # Entry point
            'App.tsx',  # Root component
            '.test.ts',  # Test files
            '.test.tsx',  # Test files
            'vite.config.ts',  # Config files
            'vitest.config.ts',  # Config files
            'ecosystem.config',  # Config files
        ]
        
        for file_path in all_files:
            file_name = file_path.name
            
            # Skip excluded patterns
            if any(pattern in file_name for pattern in exclude_patterns):
                continue
            
            # Search for imports of this file
            file_stem = file_path.stem
            import_patterns = [
                f"from ['\"].*{file_stem}",
                f"import ['\"].*{file_stem}",
            ]
            
            found_import = False
            for pattern in import_patterns:
                try:
                    result = subprocess.run(
                        ["grep", "-r", "-l", pattern, "apps/"],
                        cwd=self.repo_root,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    
                    if result.returncode == 0 and result.stdout.strip():
                        # Filter out self-imports
                        imports = [f for f in result.stdout.strip().split('\n') 
                                 if f and str(file_path) not in f]
                        if imports:
                            found_import = True
                            break
                except:
                    pass
            
            if not found_import:
                # Get file size and age
                stat = file_path.stat()
                unused_files.append({
                    'file': str(file_path.relative_to(self.repo_root)),
                    'size_bytes': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d')
                })
        
        self.log(f"Found {len(unused_files)} potentially unused files")
        return unused_files
    
    def generate_report(self, output_path: Path = None) -> str:
        """Generate markdown report of dead code findings"""
        
        # Run all detections
        commented_blocks = self.detect_commented_code_blocks()
        unused_exports = self.detect_unused_exports()
        unused_files = self.detect_potentially_unused_files()
        
        # Calculate totals
        total_issues = len(commented_blocks) + len(unused_exports) + len(unused_files)
        
        # Generate report
        report = f"""# Dead Code Detection Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Repository:** TerrainSim
**Total Issues:** {total_issues}

---

## Summary

| Category | Count |
|----------|-------|
| Commented Code Blocks (>5 lines) | {len(commented_blocks)} |
| Files with Unused Exports | {len(unused_exports)} |
| Potentially Unused Files | {len(unused_files)} |

---

## 1. Commented-Out Code Blocks

"""
        
        if commented_blocks:
            report += f"Found **{len(commented_blocks)}** large commented code blocks that may be dead code:\n\n"
            for block in commented_blocks:
                report += f"### {block['file']} (Lines {block['start_line']}-{block['end_line']})\n\n"
                report += f"**{block['line_count']} consecutive commented lines**\n\n"
                report += "```typescript\n"
                report += block['preview']
                report += "\n```\n\n"
        else:
            report += "✅ No large commented code blocks found.\n\n"
        
        report += "---\n\n## 2. Unused Exports\n\n"
        
        if unused_exports:
            report += f"Found **{len(unused_exports)}** files with unused exports:\n\n"
            for file_path, exports in unused_exports.items():
                report += f"### {file_path}\n\n"
                report += "**Unused exports:**\n"
                for export in exports:
                    report += f"- `{export}`\n"
                report += "\n"
        else:
            report += "✅ No unused exports found.\n\n"
        
        report += "---\n\n## 3. Potentially Unused Files\n\n"
        
        if unused_files:
            report += f"Found **{len(unused_files)}** files that are never imported:\n\n"
            report += "| File | Size | Last Modified |\n"
            report += "|------|------|---------------|\n"
            for file in unused_files:
                size_kb = file['size_bytes'] / 1024
                report += f"| {file['file']} | {size_kb:.1f} KB | {file['modified']} |\n"
            report += "\n**Note:** These files may be entry points, config files, or utilities. Manual review recommended.\n\n"
        else:
            report += "✅ No potentially unused files found.\n\n"
        
        report += "---\n\n## Recommendations\n\n"
        
        if total_issues > 0:
            report += "### Immediate Actions\n\n"
            if commented_blocks:
                report += f"1. **Review {len(commented_blocks)} commented code blocks** - Remove if no longer needed\n"
            if unused_exports:
                report += f"2. **Clean up {len(unused_exports)} files with unused exports** - Remove unused exports or mark as intentional\n"
            if unused_files:
                report += f"3. **Review {len(unused_files)} potentially unused files** - Confirm they are not entry points, then consider removal\n"
        else:
            report += "✅ **Codebase is clean!** No dead code detected.\n"
        
        report += "\n---\n\n"
        report += "*Generated by `scripts/detect-dead-code.py`*\n"
        
        # Save report
        if output_path:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\nReport saved to: {output_path}")
        
        return report

def main():
    parser = argparse.ArgumentParser(
        description="Detect dead code in TerrainSim repository"
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Print detailed progress information'
    )
    parser.add_argument(
        '--output',
        type=Path,
        help='Output path for markdown report (default: docs/temp/DEAD_CODE_REPORT_<date>.md)',
    )
    
    args = parser.parse_args()
    
    # Get repository root
    repo_root = Path(__file__).parent.parent.resolve()
    
    if args.verbose:
        print(f"Repository root: {repo_root}")
    
    # Default output path
    if args.output is None:
        date_str = datetime.now().strftime('%Y-%m-%d')
        args.output = repo_root / "docs" / "temp" / f"DEAD_CODE_REPORT_{date_str}.md"
    
    print(f"\nDead Code Detection for TerrainSim")
    print(f"=" * 60)
    
    try:
        detector = DeadCodeDetector(repo_root, verbose=args.verbose)
        report = detector.generate_report(args.output)
        
        # Print summary
        print(f"\nDetection Summary:")
        print(f"   Report: {args.output}")
        
        # Exit with code 1 if dead code found
        if "Total Issues:** 0" not in report:
            print(f"\nWARNING: Dead code detected! Review the report for details.")
            return 1
        else:
            print(f"\nSUCCESS: No dead code found!")
            return 0
            
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        return 2
    except Exception as e:
        print(f"\n\nError: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 2

if __name__ == "__main__":
    sys.exit(main())
