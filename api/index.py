"""
api/index.py
────────────
Vercel Serverless Function entrypoint for FastAPI.
Vercel executes this file for requests routed to /api/*.
"""
import sys
import os

# Ensure backend directory is in Python module search path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
