FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -e .[dev]

COPY alembic /app/alembic
COPY app /app/app
COPY scripts /app/scripts
COPY alembic.ini /app/alembic.ini

RUN groupadd --system app \
    && useradd --system --gid app app \
    && chmod +x /app/scripts/start-api.sh \
    && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["/app/scripts/start-api.sh"]
