"""Redis-backed storage for each user's Ask Carta AI conversation."""

import json
import logging
from typing import Any

import redis

from core import config

logger = logging.getLogger(__name__)

HISTORY_TTL_SECONDS = 7 * 24 * 60 * 60

_client: redis.Redis | None = None


def _get_client() -> redis.Redis | None:
    global _client
    if _client is not None:
        return _client
    client = redis.from_url(
        config.REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=2,
        health_check_interval=30,
    )
    try:
        client.ping()
    except redis.RedisError as error:
        logger.warning("Redis is unavailable: %s", error)
        return None
    _client = client
    return _client


def _history_key(user_id: str) -> str:
    return f"chat_history:{user_id}"


def get_chat_history(user_id: str) -> list[dict[str, Any]]:
    client = _get_client()
    if client is None:
        return []
    try:
        raw = client.get(_history_key(user_id))
    except redis.RedisError as error:
        logger.warning("Failed to read chat history: %s", error)
        return []
    if not raw:
        return []
    try:
        messages = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Stored chat history for user is not valid JSON")
        return []
    return messages if isinstance(messages, list) else []


def save_chat_history(user_id: str, messages: list[dict[str, Any]]) -> bool:
    client = _get_client()
    if client is None:
        return False
    try:
        client.set(
            _history_key(user_id),
            json.dumps(messages, ensure_ascii=False, default=str),
            ex=HISTORY_TTL_SECONDS,
        )
    except redis.RedisError as error:
        logger.warning("Failed to save chat history: %s", error)
        return False
    return True
