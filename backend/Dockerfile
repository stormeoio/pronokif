# -----------------------------------------------------------
# Pronokif Backend — multi-stage Dockerfile
# Target image size: < 200 MB (python:3.12-slim)
# -----------------------------------------------------------

# ---- build stage: install deps in a virtual env ----
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for pip compile (some wheels need gcc)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---- runtime stage: slim image with only what we need ----
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy virtualenv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Remove dev/test files from the image
RUN rm -rf tests/ requirements-dev.txt .env .env.* __pycache__/

EXPOSE 8000

# Health check — /api/health or /docs (FastAPI default)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/docs')" || exit 1

# Run with uvicorn — 2 workers for small VPS, configurable via env
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
