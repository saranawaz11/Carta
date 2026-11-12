#!/usr/bin/env python3
"""
One-shot cleanup script for completed tasks older than 7 days.
Run from deployment's native scheduler (e.g., cron, systemd timer, cloud functions).

Example usage:
    cd backend && uv run python scripts/cleanup_completed_tasks.py
"""
import os
import sys

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

from core.db import new_session
from services.task_cleanup import cleanup_expired_tasks


def main() -> int:
    try:
        db = new_session()
        deleted_count = cleanup_expired_tasks(db)
        db.close()
        print(f"Cleanup complete: {deleted_count} expired tasks removed.")
        return 0
    except Exception as error:
        print(f"Cleanup failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
