from sqlalchemy.orm import Session
from repositories import tasks as tasks_repository


def cleanup_expired_tasks(db: Session) -> int:
    """
    Clean up completed tasks older than 7 days.
    Returns the count of deleted tasks.
    Uses UTC time for all calculations.
    """
    return tasks_repository.cleanup_expired_tasks(db)
