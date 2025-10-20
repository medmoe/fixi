#!/usr/bin/env python3
"""
ci_checks.py

Run linting, tests and type-checking in sequence:
  1) `uv run ruff check src`
  2) `uv run pytest`
  3) `uv run mypy src --config-file pyproject.toml`
"""

import subprocess
import sys

def run(cmd, name):
    print(f"\n=== Running {name} ===")
    print("Command:", " ".join(cmd))
    try:
        # check=True will raise CalledProcessError if non-zero exit
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ {name} failed with exit code {e.returncode}")
        sys.exit(e.returncode)
    else:
        print(f"✅ {name} succeeded")

def main():
    # Step 1: lint
    run(["uv", "run", "ruff", "check", "src"], "Linting (ruff)")

    # Step 2: tests
    run(["uv", "run", "pytest"], "Running tests (pytest)")

    # Step 3: type-checking
    run(["uv", "run", "mypy", "src", "--config-file", "pyproject.toml"], "Type-checking (mypy)")

    print("\n🎉 All checks passed.")

if __name__ == "__main__":
    main()
