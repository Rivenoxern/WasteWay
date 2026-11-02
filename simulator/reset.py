"""
simulator/reset.py
──────────────────
Quick utility script to reset the database back to clean initial state.

Usage:
    python simulator/reset.py
"""
import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from seed import reset_and_seed

if __name__ == "__main__":
    reset_and_seed(reset=True)
