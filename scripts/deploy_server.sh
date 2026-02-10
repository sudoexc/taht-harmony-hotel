#!/usr/bin/env bash
set -euo pipefail

HOST="${TAHT_SSH_HOST:-93.93.207.167}"
USER="${TAHT_SSH_USER:-root}"
PORT="${TAHT_SSH_PORT:-22}"
DEST="/opt/taht-harmony-hotel"

RSYNC_SSH="ssh -p ${PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

if command -v sshpass >/dev/null 2>&1 && [[ -n "${TAHT_SSH_PASS:-}" ]]; then
  RSYNC_PREFIX="sshpass -e"
else
  RSYNC_PREFIX=""
fi

echo "==> Sync project to ${USER}@${HOST}:${DEST}"
${RSYNC_PREFIX} rsync -av \
  -e "${RSYNC_SSH}" \
  --exclude node_modules \
  --exclude dist \
  --exclude server/node_modules \
  --exclude .git \
  ./ "${USER}@${HOST}:${DEST}/"

echo "==> Build and restart services on server"
${RSYNC_PREFIX} ${RSYNC_SSH} "${USER}@${HOST}" "bash -lc '
  export NVM_DIR=/root/.nvm
  . /root/.nvm/nvm.sh
  nvm use 20 >/dev/null

  cd ${DEST}/server
  npm install
  npm run prisma:generate
  npx prisma migrate deploy
  npm run build
  systemctl restart taht-api

  cd ${DEST}
  npm install
  npm run build
'"

echo "==> Done"
