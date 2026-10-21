FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv

# Runtime dependencies only: tests and dev tools (requirements-dev.txt) never enter the image.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Non-root: uid 10001 owns the data directory and nothing else.
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app \
    && mkdir -p /srv/data && chown app:app /srv/data

COPY app ./app

USER app
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)"]

# Single worker: the rate limiter is in-process (see app/ratelimit.py). No --reload.
# --no-proxy-headers: the app resolves the client IP itself from TRUSTED_PROXIES (app/ratelimit.py), so
# uvicorn must not rewrite it. --no-access-log: the app already writes one JSON line per request.
# --no-server-header: do not advertise the server software.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--no-access-log", "--no-server-header"]
