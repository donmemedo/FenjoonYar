"""In-memory sliding-window rate limiter plus client IP resolution."""
import ipaddress
import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi import Request

from .config import settings
from .errors import ApiError
from .observability import audit

MAX_KEYS = 50_000


class SlidingWindowLimiter:
    # ponytail: in-process limiter, move to Redis when running more than one worker.
    def __init__(self, clock: Callable[[], float] = time.monotonic, max_keys: int = MAX_KEYS) -> None:
        self._clock = clock
        self._max_keys = max_keys
        self._lock = threading.Lock()
        self._hits: dict[str, tuple[float, deque[float]]] = {}

    def _live(self, key: str, window: float, now: float) -> deque[float]:
        entry = self._hits.get(key)
        if entry is None:
            if len(self._hits) >= self._max_keys:
                self._purge(now)
                if len(self._hits) >= self._max_keys:  # flood of distinct keys: drop the oldest
                    del self._hits[next(iter(self._hits))]
            dq: deque[float] = deque()
            self._hits[key] = (window, dq)
            return dq
        dq = entry[1]
        while dq and dq[0] <= now - window:
            dq.popleft()
        return dq

    @staticmethod
    def _wait(dq: deque[float], window: float, now: float) -> int:
        return max(1, int(dq[0] + window - now) + 1)

    def check(self, key: str, limit: int, window: float) -> int:
        """Seconds to wait if `key` is at its limit, else 0. Records nothing."""
        with self._lock:
            now = self._clock()
            dq = self._live(key, window, now)
            return self._wait(dq, window, now) if len(dq) >= limit else 0

    def record(self, key: str, window: float) -> None:
        with self._lock:
            now = self._clock()
            self._live(key, window, now).append(now)

    def hit(self, key: str, limit: int, window: float) -> int:
        """Atomic check-and-record. Returns seconds to wait, or 0 when the hit was allowed."""
        with self._lock:
            now = self._clock()
            dq = self._live(key, window, now)
            if len(dq) >= limit:
                return self._wait(dq, window, now)
            dq.append(now)
            return 0

    def _purge(self, now: float) -> int:
        dead = [k for k, (w, dq) in self._hits.items() if not dq or dq[-1] <= now - w]
        for k in dead:
            del self._hits[k]
        return len(dead)

    def purge(self) -> int:
        with self._lock:
            return self._purge(self._clock())

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def __len__(self) -> int:
        return len(self._hits)


limiter = SlidingWindowLimiter()


def too_many(name: str, wait: int) -> ApiError:
    audit("rate_limited", limiter=name, retry_after=wait)
    return ApiError(429, "rate_limited", retry_after=wait)


def enforce(name: str, key: str, limit: int, window: float) -> None:
    """Count one hit on `key`; raise 429 rate_limited when over the limit."""
    wait = limiter.hit(key, limit, window)
    if wait:
        raise too_many(name, wait)


def client_ip(request: Request) -> str:
    """Socket peer, or with TRUSTED_PROXIES=N the Nth X-Forwarded-For entry from the right."""
    peer = request.client.host if request.client else "unknown"
    n = settings.trusted_proxies
    if n > 0:
        raw = ",".join(request.headers.getlist("x-forwarded-for"))
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        if len(parts) >= n:
            try:
                return str(ipaddress.ip_address(parts[-n]))
            except ValueError:
                pass
    return peer
