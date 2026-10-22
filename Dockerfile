FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS api
COPY --from=ghcr.io/astral-sh/uv:0.12.22 /uv /usr/local/bin/uv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY backend/ ./
ENV PATH="/app/backend/.venv/bin:$PATH"
# This throwaway build value is never used by the running service.
RUN DJANGO_SECRET_KEY=static-build-only python manage.py collectstatic --noinput \
    && groupadd --gid 10001 worldline \
    && useradd --uid 10001 --gid worldline --no-create-home worldline \
    && mkdir /state && chown worldline:worldline /state
USER worldline
CMD ["gunicorn", "--config", "config/gunicorn.py", "config.wsgi:application"]

FROM caddy:2.10-alpine AS web
COPY --from=frontend /build/dist /srv/web
COPY --from=api /app/backend/staticfiles /srv/static
COPY deploy/Caddyfile /etc/caddy/Caddyfile
