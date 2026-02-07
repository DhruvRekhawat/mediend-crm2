#!/bin/bash
set -e

# ============================================================
# Mediend CRM - One-command deploy
# Usage: ./deploy.sh
# ============================================================

VPS_IP="93.127.195.235"
VPS_USER="root"
APP_DIR="/opt/mediend-crm"

COMMIT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "===> Pushing code to GitHub..."
git push origin main

echo "===> Deploying commit $COMMIT to VPS..."
ssh ${VPS_USER}@${VPS_IP} << ENDSSH
  cd ${APP_DIR}
  echo "--- Pulling latest code..."
  git pull origin main
  echo "--- Setting deploy metadata..."
  export DEPLOY_COMMIT=${COMMIT}
  export DEPLOY_TIME=${TIMESTAMP}
  echo "--- Building and restarting app container..."
  DEPLOY_COMMIT=${COMMIT} DEPLOY_TIME=${TIMESTAMP} docker compose up --build -d app
  echo "--- Cleaning up old images..."
  docker image prune -f
  echo "--- Status:"
  docker compose ps
ENDSSH

echo ""
echo "===> Deployed $COMMIT at $TIMESTAMP"
echo "===> App: https://workspace.mediend.com"
echo "===> Status: https://status.mediend.com"
