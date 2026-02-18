#!/usr/bin/env bash
set -euo pipefail

HOST="${TAHT_SSH_HOST:-93.93.207.167}"
USER="${TAHT_SSH_USER:-root}"
PORT="${TAHT_SSH_PORT:-22}"
DEST="/opt/taht-harmony-hotel"

RSYNC_SSH="ssh -p ${PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

if command -v sshpass >/dev/null 2>&1 && [[ -n "${TAHT_SSH_PASS:-}" ]]; then
  RSYNC_PREFIX="sshpass -e"
  SSH_CMD="sshpass -e ssh -p ${PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
else
  RSYNC_PREFIX=""
  SSH_CMD="ssh -p ${PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
fi

echo "==> Sync backend to ${USER}@${HOST}:${DEST}/backend"
${RSYNC_PREFIX} rsync -av \
  -e "${RSYNC_SSH}" \
  --exclude .env \
  --exclude __pycache__ \
  --exclude "*.pyc" \
  --exclude .git \
  --exclude venv \
  ./ "${USER}@${HOST}:${DEST}/backend/"

echo "==> Set up Python venv and install deps"
${SSH_CMD} "${USER}@${HOST}" "bash -lc '
  set -e
  cd ${DEST}/backend

  # Install python3-venv if not present
  if ! python3 -m venv --help >/dev/null 2>&1; then
    apt-get install -y python3-venv python3-pip
  fi

  # Create venv if not exists
  if [ ! -d venv ]; then
    python3 -m venv venv
  fi

  # Install requirements
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt

  echo \"==> Python deps installed\"
'"

echo "==> Run Django migrations (contenttypes only)"
${SSH_CMD} "${USER}@${HOST}" "bash -lc '
  set -e
  cd ${DEST}/backend
  ./venv/bin/python manage.py migrate --run-syncdb 2>&1 | head -20 || ./venv/bin/python manage.py migrate contenttypes
  echo \"==> Migrations done\"
'"

echo "==> Install systemd service for Django"
${SSH_CMD} "${USER}@${HOST}" "bash -lc '
  cat > /etc/systemd/system/taht-api.service << '\''EOF'\''
[Unit]
Description=Taht Harmony Hotel Django API
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${DEST}/backend
ExecStart=${DEST}/backend/venv/bin/gunicorn hotel_crm.wsgi:application --bind 0.0.0.0:4000 --workers 3 --timeout 60
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  echo \"==> Service file written\"
'"

echo "==> Restart taht-api service"
${SSH_CMD} "${USER}@${HOST}" "bash -lc '
  systemctl restart taht-api
  sleep 2
  systemctl status taht-api --no-pager | head -20
'"

echo "==> Test health endpoint"
sleep 2
curl -s "https://tizimagency.uz/testcrmhotel/api/health" || echo "(curl failed - may need a moment)"

echo "==> Done!"
