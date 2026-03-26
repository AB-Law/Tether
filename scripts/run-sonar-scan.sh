#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
SCRIPT_ENV_FILE="${ROOT_DIR}/scripts/.env"

SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9001}"
SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-Tether}"

usage() {
  cat <<'EOF'
Usage:
  scripts/run-sonar-scan.sh [--env-file PATH] [--host-url URL] [--project-key KEY] [--skip-tests]

Reads SONAR_TOKEN from the env file (default: ../.env from repo root, fallback: scripts/.env),
generates backend + frontend coverage reports, then runs pysonar.

Environment variables:
  SONAR_HOST_URL     Optional. Default: http://localhost:9001
  SONAR_PROJECT_KEY  Optional. Default: Tether

Required in env file:
  SONAR_TOKEN=<your-sonar-token>
EOF
}

RUN_TESTS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --host-url)
      SONAR_HOST_URL="$2"
      shift 2
      ;;
    --project-key)
      SONAR_PROJECT_KEY="$2"
      shift 2
      ;;
    --skip-tests)
      RUN_TESTS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v pysonar >/dev/null 2>&1; then
  echo "pysonar is not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  if [[ -f "${SCRIPT_ENV_FILE}" ]]; then
    ENV_FILE="${SCRIPT_ENV_FILE}"
    echo "Using fallback env file: ${ENV_FILE}"
  else
    echo "Env file not found: ${ENV_FILE}" >&2
    echo "Fallback env file also not found: ${SCRIPT_ENV_FILE}" >&2
    exit 1
  fi
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "SONAR_TOKEN is missing in ${ENV_FILE}" >&2
  exit 1
fi

if [[ "${RUN_TESTS}" -eq 1 ]]; then
  echo "Generating backend coverage report..."
  python -m pip install -e "${ROOT_DIR}/backend[dev]" >/dev/null
  pytest "${ROOT_DIR}/backend/tests/" --cov="${ROOT_DIR}/backend/app" --cov-report=xml:"${ROOT_DIR}/backend/coverage.xml"

  echo "Generating frontend coverage report..."
  npm ci --prefix "${ROOT_DIR}/frontend" >/dev/null
  npm run test --prefix "${ROOT_DIR}/frontend"
fi

pysonar \
  --sonar-host-url="${SONAR_HOST_URL}" \
  --sonar-token="${SONAR_TOKEN}" \
  --sonar-project-key="${SONAR_PROJECT_KEY}"
