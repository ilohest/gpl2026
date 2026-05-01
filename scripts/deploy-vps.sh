#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-vps.sh [options]

Options:
  --host <ip|hostname>            VPS host (required unless VPS_HOST set)
  --user <user>                   VPS user (default: root or VPS_USER)
  --app-dir <path>                Remote app directory (required unless APP_DIR set)
  --domain <domain>               Domain for smoke tests (optional unless --smoke)

  --backend-env <path>            Local backend env file (default: backend/.env or BACKEND_ENV_PATH)
  --front-env <path>              Local front env file (default: .env or FRONT_ENV_PATH) (optional)
  --sync-front-env                Also upload front env file to VPS
  --sync-firebase-adminsdk <path> Upload Firebase Admin SDK json (secret) from given path (or FIREBASE_ADMINSDK_PATH)

  --no-build                       Skip frontend build
  --no-install                     Skip 'npm ci' on VPS backend
  --no-restart                     Skip pm2 restart
  --no-reload-apache               Skip apache reload
  --no-smoke                       Skip HTTP smoke tests

  --pm2-name <name>                PM2 process name (default: gpl2026)
  --bootstrap-pm2                  If pm2 process missing or misconfigured, (re)create it

Environment variables (alternative to flags):
  VPS_HOST, VPS_USER, APP_DIR, DOMAIN
  BACKEND_ENV_PATH, FRONT_ENV_PATH, FIREBASE_ADMINSDK_PATH

Recommended:
  - Use SSH keys (no passwords)
  - Keep secrets only in local files, not committed
EOF
}

log() {
  printf "\n== %s ==\n" "$1"
}

die() {
  echo "❌ $*" >&2
  exit 1
}

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
APP_DIR="${APP_DIR:-}"
DOMAIN="${DOMAIN:-}"

BACKEND_ENV_PATH="${BACKEND_ENV_PATH:-backend/.env}"
FRONT_ENV_PATH="${FRONT_ENV_PATH:-.env}"
SYNC_FRONT_ENV=0
FIREBASE_ADMINSDK_PATH="${FIREBASE_ADMINSDK_PATH:-}"

DO_BUILD=1
DO_INSTALL=1
DO_RESTART=1
DO_RELOAD_APACHE=1
DO_SMOKE=1

PM2_NAME="gpl2026"
BOOTSTRAP_PM2=0

if [[ -f ".deploy-vps.env" ]]; then
  # shellcheck disable=SC1091
  source ".deploy-vps.env"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      VPS_HOST="${2:-}"; shift 2 ;;
    --user)
      VPS_USER="${2:-}"; shift 2 ;;
    --app-dir)
      APP_DIR="${2:-}"; shift 2 ;;
    --domain)
      DOMAIN="${2:-}"; shift 2 ;;
    --backend-env)
      BACKEND_ENV_PATH="${2:-}"; shift 2 ;;
    --front-env)
      FRONT_ENV_PATH="${2:-}"; shift 2 ;;
    --sync-front-env)
      SYNC_FRONT_ENV=1; shift 1 ;;
    --sync-firebase-adminsdk)
      FIREBASE_ADMINSDK_PATH="${2:-}"; shift 2 ;;
    --no-build)
      DO_BUILD=0; shift 1 ;;
    --no-install)
      DO_INSTALL=0; shift 1 ;;
    --no-restart)
      DO_RESTART=0; shift 1 ;;
    --no-reload-apache)
      DO_RELOAD_APACHE=0; shift 1 ;;
    --no-smoke)
      DO_SMOKE=0; shift 1 ;;
    --pm2-name)
      PM2_NAME="${2:-}"; shift 2 ;;
    --bootstrap-pm2)
      BOOTSTRAP_PM2=1; shift 1 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      die "Unknown arg: $1 (use --help)" ;;
  esac
done

[[ -n "$VPS_HOST" ]] || die "Missing --host (or VPS_HOST)"
[[ -n "$APP_DIR" ]] || die "Missing --app-dir (or APP_DIR)"
[[ -f "$BACKEND_ENV_PATH" ]] || die "Backend env not found: $BACKEND_ENV_PATH"
if [[ "$DO_SMOKE" -eq 1 && -z "$DOMAIN" ]]; then
  die "Missing --domain (or DOMAIN) for smoke tests (or use --no-smoke)"
fi

SSH="${VPS_USER}@${VPS_HOST}"

log "Sanity"
command -v rsync >/dev/null 2>&1 || die "rsync not found"
command -v ssh >/dev/null 2>&1 || die "ssh not found"

log "Frontend build"
if [[ "$DO_BUILD" -eq 1 ]]; then
  npm run -s build
else
  echo "Skipping build (--no-build)"
fi
[[ -d "dist" ]] || die "dist/ missing (build failed or --no-build without existing dist)"

log "Ensure remote directories"
ssh "$SSH" "mkdir -p \"$APP_DIR\" \"$APP_DIR/backend\" \"$APP_DIR/shared\""

log "Sync project (excluding secrets + node_modules + dist)"
rsync -rz --delete --no-owner --no-group \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'backend/node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.deploy-vps.env' \
  --exclude 'backend/.env' \
  --exclude 'backend/firebase-adminsdk.json' \
  --exclude '.DS_Store' \
  ./ "$SSH:$APP_DIR/"

log "Sync dist/ (static) with safe perms"
rsync -rz --delete --no-owner --no-group --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/ "$SSH:$APP_DIR/dist/"

log "Ensure apache can traverse + read dist/"
ssh "$SSH" "chmod 755 \"$APP_DIR\" && find \"$APP_DIR/dist\" -type d -exec chmod 755 {} \\; && find \"$APP_DIR/dist\" -type f -exec chmod 644 {} \\; && rm -f \"$APP_DIR/.deploy-vps.env\""

log "Upload backend env (secret)"
scp -q "$BACKEND_ENV_PATH" "$SSH:$APP_DIR/backend/.env.tmp"
ssh "$SSH" "install -m 600 \"$APP_DIR/backend/.env.tmp\" \"$APP_DIR/backend/.env\" && rm -f \"$APP_DIR/backend/.env.tmp\""

if [[ "$SYNC_FRONT_ENV" -eq 1 ]]; then
  [[ -f "$FRONT_ENV_PATH" ]] || die "Front env not found: $FRONT_ENV_PATH"
  log "Upload front env (optional)"
  scp -q "$FRONT_ENV_PATH" "$SSH:$APP_DIR/.env.tmp"
  ssh "$SSH" "install -m 600 \"$APP_DIR/.env.tmp\" \"$APP_DIR/.env\" && rm -f \"$APP_DIR/.env.tmp\""
fi

if [[ -n "$FIREBASE_ADMINSDK_PATH" ]]; then
  [[ -f "$FIREBASE_ADMINSDK_PATH" ]] || die "Firebase adminsdk file not found: $FIREBASE_ADMINSDK_PATH"
  log "Upload backend/firebase-adminsdk.json (secret)"
  scp -q "$FIREBASE_ADMINSDK_PATH" "$SSH:$APP_DIR/backend/firebase-adminsdk.json.tmp"
  ssh "$SSH" "install -m 600 \"$APP_DIR/backend/firebase-adminsdk.json.tmp\" \"$APP_DIR/backend/firebase-adminsdk.json\" && rm -f \"$APP_DIR/backend/firebase-adminsdk.json.tmp\" && chown root:root \"$APP_DIR/backend/firebase-adminsdk.json\" 2>/dev/null || true"
else
  log "Firebase adminsdk check"
  ssh "$SSH" "test -f \"$APP_DIR/backend/firebase-adminsdk.json\" && echo \"✅ backend/firebase-adminsdk.json present\" || echo \"⚠️ Missing backend/firebase-adminsdk.json (API will fail to start)\""
fi

if [[ "$DO_INSTALL" -eq 1 ]]; then
  log "Install backend deps (npm ci)"
  ssh "$SSH" "cd \"$APP_DIR/backend\" && npm ci --include=dev"
else
  echo "Skipping npm ci (--no-install)"
fi

if [[ "$DO_RESTART" -eq 1 ]]; then
  log "Restart backend (pm2)"
  if [[ "$BOOTSTRAP_PM2" -eq 1 ]]; then
    ssh "$SSH" "set -euo pipefail; cd \"$APP_DIR/backend\"; \
      if pm2 describe \"$PM2_NAME\" >/dev/null 2>&1; then \
        if pm2 describe \"$PM2_NAME\" | grep -q \"$APP_DIR/backend/server\\.js\"; then \
          echo \"⚠️ PM2 was pointing to server.js (old). Recreating...\"; \
          pm2 delete \"$PM2_NAME\"; \
        elif ! pm2 describe \"$PM2_NAME\" | grep -q \"server\\.ts\"; then \
          echo \"⚠️ PM2 does not mention server.ts. Recreating...\"; \
          pm2 delete \"$PM2_NAME\"; \
        fi; \
      fi; \
      if ! pm2 describe \"$PM2_NAME\" >/dev/null 2>&1; then \
        pm2 start node --name \"$PM2_NAME\" -- --import tsx server.ts; \
      else \
        pm2 restart \"$PM2_NAME\"; \
      fi; \
      pm2 save; pm2 status"
  else
    ssh "$SSH" "pm2 restart \"$PM2_NAME\" && pm2 status"
  fi
else
  echo "Skipping pm2 restart (--no-restart)"
fi

if [[ "$DO_RELOAD_APACHE" -eq 1 ]]; then
  log "Reload apache2"
  ssh "$SSH" "sudo systemctl reload apache2"
else
  echo "Skipping apache reload (--no-reload-apache)"
fi

if [[ "$DO_SMOKE" -eq 1 ]]; then
  log "Smoke tests"
  curl -sSf "https://${DOMAIN}/api/health" | cat
  curl -sSf "https://${DOMAIN}/api/ready" | cat
  echo "✅ Deploy finished"
else
  echo "✅ Deploy finished (no smoke tests)"
fi
