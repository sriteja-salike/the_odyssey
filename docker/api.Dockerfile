FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
ENV PYTHONPATH=/app/src
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY BUILD_CONTEXT ./BUILD_CONTEXT
COPY scenarios/packages ./scenarios/packages
COPY src ./src

EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "nourishops.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
