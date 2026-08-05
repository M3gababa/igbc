#!/usr/bin/env bash
# Rebuild, push, and force-redeploy api/ and/or webapp/ onto their EXISTING ECS Express Mode
# services. This is only the "Ongoing" redeploy loop from ../aws_deployment_tasks.md — initial
# setup (ECR repos, Secrets Manager, ECS service creation, ACM/ALB/Route 53) is not done here and
# must have already happened once (services must already exist), or `update-service` will fail.
# Run from this scripts/ folder.
#
# Usage:
#   ./aws-redeploy.sh [api|webapp|all]   (default: all)
#
# Override defaults via env vars if needed:
#   AWS_ACCOUNT_ID, AWS_REGION, ECS_CLUSTER

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-541467119525}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECS_CLUSTER="${ECS_CLUSTER:-default}"
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

log() { echo "[aws-redeploy] $*"; }

ecr_login() {
  log "Logging in to ECR ($ECR_REGISTRY)..."
  aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null
}

# Express Mode always appends a random suffix to the service name typed in the console
# (e.g. "igbc-api" -> "igbc-api-b749"), so the exact name can't be hardcoded — resolve it
# by prefix match against the cluster's live services instead.
resolve_service_name() {
  local prefix="$1"
  local match
  match="$(aws ecs list-services --cluster "$ECS_CLUSTER" --region "$AWS_REGION" \
    --output text --query 'serviceArns[]' | \
    tr '\t' '\n' | sed 's#.*/##' | grep -E "^${prefix}(-[A-Za-z0-9]+)?\$" | head -n1)"

  if [[ -z "$match" ]]; then
    echo "[aws-redeploy] ERROR: no ECS service matching '$prefix' (or '$prefix-<suffix>') found in cluster '$ECS_CLUSTER'." >&2
    exit 1
  fi

  echo "$match"
}

redeploy() {
  local name="$1" dir="$2"
  local image="igbc-$name"
  local repo="$ECR_REGISTRY/$image"
  local service
  service="$(resolve_service_name "$image")"

  log "Building $image from $dir (linux/amd64 — Express Mode has no ARM64 picker)..."
  docker buildx build -q --platform linux/amd64 -t "$image" "$dir" >/dev/null

  log "Pushing $repo:latest..."
  docker tag "$image:latest" "$repo:latest"
  docker push "$repo:latest" >/dev/null

  log "Forcing new deployment of ECS service $service..."
  aws ecs update-service --cluster "$ECS_CLUSTER" --service "$service" \
    --force-new-deployment --region "$AWS_REGION" >/dev/null

  log "Waiting for $service to stabilize (rolling deploy — can take a few minutes)..."
  aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$service" --region "$AWS_REGION"

  log "$service redeployed."
}

TARGET="${1:-all}"

case "$TARGET" in
  api)
    ecr_login
    redeploy api ../api
    ;;
  webapp)
    ecr_login
    redeploy webapp ../webapp
    ;;
  all)
    ecr_login
    redeploy api ../api
    redeploy webapp ../webapp
    ;;
  *)
    echo "Usage: $0 [api|webapp|all]" >&2
    exit 1
    ;;
esac
