#!/usr/bin/env python3
"""
Benchmark Regression Detection Script

Compares current benchmark results with baseline to detect performance regressions.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple


def load_json_results(filepath: Path) -> Dict:
    """Load benchmark results from JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)


def parse_baseline_md(filepath: Path) -> Dict[str, float]:
    """
    Parse baseline values from BENCHMARK_BASELINE.md.

    Expected format in markdown tables:
    | Operation | Time | ...
    | Creation | ~50 μs | ...

    Returns dict mapping operation names to time in microseconds.
    """
    baselines = {}

    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Simple parser - look for markdown tables with timing data
    in_table = False
    for line in lines:
        line = line.strip()

        # Detect table rows (ignore header and separator)
        if line.startswith('|') and 'Operation' not in line and '---' not in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]

            if len(parts) >= 2:
                operation = parts[0]
                time_str = parts[1]

                # Parse time value (e.g., "~50 μs", "~1.2 ms", "~1.75 sec")
                try:
                    time_value = parse_time_string(time_str)
                    if time_value:
                        baselines[operation] = time_value
                except:
                    pass

    return baselines


def parse_time_string(time_str: str) -> float:
    """
    Convert time string to microseconds.
    Examples: "~50 μs" -> 50.0, "~1.2 ms" -> 1200.0, "~1.75 sec" -> 1750000.0
    """
    time_str = time_str.replace('~', '').replace('<', '').strip()

    if 'μs' in time_str or 'us' in time_str:
        value = float(time_str.split('μs')[0].split('us')[0].strip())
        return value
    elif 'ms' in time_str:
        value = float(time_str.split('ms')[0].strip())
        return value * 1000  # Convert to μs
    elif 'sec' in time_str or 's' in time_str:
        value = float(time_str.split('sec')[0].split('s')[0].strip())
        return value * 1000000  # Convert to μs

    return None


def compare_benchmarks(
    baseline: Dict[str, float],
    current: Dict,
    threshold_percent: float = 10.0
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Compare current results with baseline.

    Returns:
        (regressions, improvements, unchanged)
    """
    regressions = []
    improvements = []
    unchanged = []

    # Extract benchmarks from Google Benchmark JSON format
    if 'benchmarks' in current:
        current_benchmarks = current['benchmarks']
    else:
        current_benchmarks = []

    for bench in current_benchmarks:
        name = bench.get('name', '')
        current_time = bench.get('real_time', 0)  # Time in nanoseconds
        current_time_us = current_time / 1000  # Convert to microseconds

        # Try to match with baseline (simplified matching)
        baseline_time_us = None
        for baseline_name, baseline_time in baseline.items():
            if baseline_name.lower() in name.lower():
                baseline_time_us = baseline_time
                break

        if baseline_time_us is None:
            # No baseline found, skip
            continue

        # Calculate percentage change
        percent_change = ((current_time_us - baseline_time_us) / baseline_time_us) * 100

        result = {
            'name': name,
            'baseline_us': baseline_time_us,
            'current_us': current_time_us,
            'percent_change': percent_change
        }

        if percent_change > threshold_percent:
            regressions.append(result)
        elif percent_change < -threshold_percent:
            improvements.append(result)
        else:
            unchanged.append(result)

    return regressions, improvements, unchanged


def print_results(regressions, improvements, unchanged, threshold):
    """Print formatted results."""
    print("\n" + "=" * 80)
    print("BENCHMARK REGRESSION ANALYSIS")
    print("=" * 80)

    if regressions:
        print(f"\n🔴 REGRESSIONS (>{threshold}% slower):")
        for r in regressions:
            print(f"  • {r['name']}")
            print(f"    Baseline: {r['baseline_us']:.2f} μs")
            print(f"    Current:  {r['current_us']:.2f} μs")
            print(f"    Change:   +{r['percent_change']:.1f}%")

    if improvements:
        print(f"\n🟢 IMPROVEMENTS (>{threshold}% faster):")
        for i in improvements:
            print(f"  • {i['name']}")
            print(f"    Baseline: {i['baseline_us']:.2f} μs")
            print(f"    Current:  {i['current_us']:.2f} μs")
            print(f"    Change:   {i['percent_change']:.1f}%")

    if unchanged:
        print(f"\n⚪ UNCHANGED (within ±{threshold}%):")
        for u in unchanged:
            print(f"  • {u['name']}: {u['percent_change']:+.1f}%")

    print("\n" + "=" * 80)


def main():
    if len(sys.argv) < 3:
        print("Usage: python compare-benchmarks.py <baseline_md> <current_json> [threshold_percent]")
        print("Example: python compare-benchmarks.py docs/infra/BENCHMARK_BASELINE.md results.json 10")
        sys.exit(1)

    baseline_path = Path(sys.argv[1])
    current_path = Path(sys.argv[2])
    threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0

    if not baseline_path.exists():
        print(f"❌ Baseline file not found: {baseline_path}")
        sys.exit(1)

    if not current_path.exists():
        print(f"❌ Current results file not found: {current_path}")
        sys.exit(1)

    # Load data
    print(f"📊 Loading baseline from: {baseline_path}")
    baseline = parse_baseline_md(baseline_path)

    print(f"📊 Loading current results from: {current_path}")
    current = load_json_results(current_path)

    # Compare
    regressions, improvements, unchanged = compare_benchmarks(baseline, current, threshold)

    # Print results
    print_results(regressions, improvements, unchanged, threshold)

    # Exit with error if regressions found
    if regressions:
        print(f"\n❌ Found {len(regressions)} performance regression(s)")
        sys.exit(1)
    else:
        print(f"\n✅ No performance regressions detected")
        sys.exit(0)


if __name__ == '__main__':
    main()
