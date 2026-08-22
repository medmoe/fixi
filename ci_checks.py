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
from pathlib import Path
from shutil import which


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


def build_tool_cmd(tool: str, *args: str) -> list[str]:
    uv = which("uv")
    if uv:
        return [uv, "run", tool, *args]

    venv_tool = Path(".venv") / "bin" / tool
    if venv_tool.exists():
        return [str(venv_tool), *args]

    path_tool = which(tool)
    if path_tool:
        return [path_tool, *args]

    return [sys.executable, "-m", tool, *args]


def main():
    # Step 1: lint
    run(build_tool_cmd("ruff", "check", "src"), "Linting (ruff)")

    # Step 2: tests
    run(["docker", "compose", "-f", "docker-compose.test.yml", "run", "--rm", "tests", "pytest", "-x", "-v"], "Running tests (pytest)")
    run(["docker", "compose", "-f", "docker-compose.test.yml", "down", "-v", "--remove-orphans"], "Removing test containers")

    # Step 3: type-checking
    run(build_tool_cmd("mypy", "src", "--config-file", "pyproject.toml"), "Type-checking (mypy)")

    print("\n🎉 All checks passed.")


if __name__ == "__main__":
    main()
