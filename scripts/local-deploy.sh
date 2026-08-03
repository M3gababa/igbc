#!/usr/bin/env bash
# Build and run api/ + webapp/ Docker images locally. See ../DEPLOYMENT.md for the manual
# version of every step this script runs. Run from this scripts/ folder.
#
# Usage:
#   ./local-deploy.sh [build|up|down|logs|status]   (default: up)
#   build - rebuild both images and replace the running containers
#   up    - (re)start containers from the existing igbc-api:local/igbc-webapp:local images,
#           without rebuilding — run 'build' first if those images don't exist yet

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

NETWORK=igbc-net
CERT_FILE="$(pwd)/prisma_certificates.pem"
API_ENV="../api/.env"
WEBAPP_ENV="../webapp/bff/.env"
API_CONTAINER=igbc-api
WEBAPP_CONTAINER=igbc-webapp
API_PORT=4000
WEBAPP_PORT=3000

log() { echo "[local-deploy] $*"; }

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing $1 — see DEPLOYMENT.md / CLAUDE.md for how to create it." >&2
    exit 1
  fi
}

require_image() {
  if ! docker image inspect "$1" >/dev/null 2>&1; then
    echo "Image $1 not found — run './local-deploy.sh build' first." >&2
    exit 1
  fi
}

start_containers() {
  require_file "$API_ENV"
  require_file "$WEBAPP_ENV"
  require_file "$CERT_FILE"

  docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK" >/dev/null

  docker rm -f "$API_CONTAINER" "$WEBAPP_CONTAINER" >/dev/null 2>&1 || true

  log "Starting igbc-api on :$API_PORT..."
  docker run -d --rm --name "$API_CONTAINER" --network "$NETWORK" -p "$API_PORT:4000" \
    --env-file "$API_ENV" -e PORT=4000 \
    -e NODE_EXTRA_CA_CERTS=/certs/prisma_certificates.pem \
    -v "$CERT_FILE:/certs/prisma_certificates.pem:ro" \
    igbc-api:local >/dev/null

  log "Waiting for igbc-api /health..."
  for _ in $(seq 1 30); do
    if curl -sf "http://localhost:$API_PORT/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if ! curl -sf "http://localhost:$API_PORT/health" >/dev/null 2>&1; then
    echo "igbc-api never became healthy — check: docker logs $API_CONTAINER" >&2
    exit 1
  fi

  log "Starting igbc-webapp on :$WEBAPP_PORT..."
  docker run -d --rm --name "$WEBAPP_CONTAINER" --network "$NETWORK" -p "$WEBAPP_PORT:3000" \
    --env-file "$WEBAPP_ENV" -e PORT=3000 \
    -e API_BASE_URL="http://$API_CONTAINER:4000" \
    -e APP_BASE_URL="http://localhost:$WEBAPP_PORT" \
    -e NODE_EXTRA_CA_CERTS=/certs/prisma_certificates.pem \
    -v "$CERT_FILE:/certs/prisma_certificates.pem:ro" \
    igbc-webapp:local >/dev/null

  log "Up. api: http://localhost:$API_PORT/docs   webapp: http://localhost:$WEBAPP_PORT"
  log "Make sure http://localhost:$WEBAPP_PORT/auth/callback is an Allowed Callback URL in Auth0."
  log "Use './local-deploy.sh logs' to tail both, './local-deploy.sh down' to stop."
}

cmd_build() {
  log "Building igbc-api..."
  docker build -q -t igbc-api:local ../api >/dev/null

  log "Building igbc-webapp..."
  docker build -q -t igbc-webapp:local ../webapp >/dev/null

  start_containers
}

cmd_up() {
  require_image igbc-api:local
  require_image igbc-webapp:local
  start_containers
}

cmd_down() {
  log "Stopping containers..."
  docker stop "$API_CONTAINER" "$WEBAPP_CONTAINER" >/dev/null 2>&1 || true
  log "Down."
}

cmd_logs() {
  docker logs -f "$API_CONTAINER" &
  docker logs -f "$WEBAPP_CONTAINER" &
  wait
}

cmd_status() {
  docker ps --filter "name=$API_CONTAINER" --filter "name=$WEBAPP_CONTAINER" \
    --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
}

case "${1:-up}" in
  build) cmd_build ;;
  up) cmd_up ;;
  down) cmd_down ;;
  logs) cmd_logs ;;
  status) cmd_status ;;
  *) echo "Usage: $0 [build|up|down|logs|status]" >&2; exit 1 ;;
esac
