#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Daily Closing — one-time server setup (Ubuntu 22.04 / 24.04)
#  Run from inside the uploaded app folder:
#      sudo bash deploy/setup.sh  your-name.duckdns.org
#  What it does:
#    • security updates (automatic from now on), firewall (only SSH/80/443), fail2ban
#    • SSH: key-only login, no root login (only if you already log in with a key)
#    • Node.js 20, the app as a locked-down service under its own user (not root)
#    • Caddy in front: free HTTPS certificate, renewed automatically
#    • daily database backups (built into the app) in /var/lib/daily-closing/backups
#  Safe to run again (e.g. after changing the domain).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR=/opt/daily-closing
DATA_DIR=/var/lib/daily-closing
APP_USER=dailyclose
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run with sudo:  sudo bash deploy/setup.sh your-name.duckdns.org"
[ -n "$DOMAIN" ] || die "domain missing:  sudo bash deploy/setup.sh your-name.duckdns.org"
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "invalid domain: $DOMAIN"
[ -f "$SRC_DIR/server.js" ] || die "run this from inside the uploaded app folder"

export DEBIAN_FRONTEND=noninteractive

say "1/8  System updates"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg rsync unattended-upgrades fail2ban build-essential python3 debian-keyring debian-archive-keyring apt-transport-https
# install security updates automatically every day
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# small servers (512MB–1GB, e.g. the cheapest Lightsail plans): add 1GB swap so installs never run out of memory
if [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 1500 ] && ! swapon --show | grep -q .; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   1GB swap added"
fi

say "2/8  Firewall: only SSH (22), HTTP (80), HTTPS (443)"
if [ -f /etc/iptables/rules.v4 ]; then
  # Oracle Cloud images ship with iptables rules that block everything but SSH
  for p in 80 443; do
    iptables -C INPUT -p tcp --dport "$p" -m state --state NEW -j ACCEPT 2>/dev/null ||
      iptables -I INPUT 5 -p tcp --dport "$p" -m state --state NEW -j ACCEPT
  done
  command -v netfilter-persistent >/dev/null || apt-get install -y iptables-persistent
  netfilter-persistent save
else
  apt-get install -y ufw
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

say "3/8  SSH hardening + fail2ban"
SUDO_HOME=$(getent passwd "${SUDO_USER:-root}" | cut -d: -f6)
if [ -s "$SUDO_HOME/.ssh/authorized_keys" ]; then
  mkdir -p /etc/ssh/sshd_config.d
  cat >/etc/ssh/sshd_config.d/90-daily-closing.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
else
  echo "   (skipped: no SSH key found for ${SUDO_USER:-root}, password login left as is)"
fi
cat >/etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

say "4/8  Node.js 20"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

say "5/8  App user and folders"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR" "$DATA_DIR/backups"
# data is readable by the app user only
chown -R "$APP_USER:$APP_USER" "$DATA_DIR"
chmod 700 "$DATA_DIR"

say "6/8  Install the app"
rsync -a --delete --exclude node_modules --exclude data --exclude .git "$SRC_DIR/" "$APP_DIR/"
# if a database was uploaded next to the app (data/shrakh.db) and the server has none yet, use it
if [ -f "$SRC_DIR/data/shrakh.db" ] && [ ! -f "$DATA_DIR/shrakh.db" ]; then
  cp "$SRC_DIR/data/shrakh.db" "$DATA_DIR/shrakh.db"
  echo "   existing database copied to $DATA_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$DATA_DIR"
cd "$APP_DIR"
sudo -u "$APP_USER" -H npm ci --omit=dev --no-audit --no-fund

say "7/8  App service (starts on boot, restarts if it stops)"
cat >/etc/systemd/system/daily-closing.service <<EOF
[Unit]
Description=Daily Closing
After=network.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
Environment=TRUST_PROXY=1
Environment=DATA_DIR=$DATA_DIR
Environment=TZ=Asia/Riyadh
Restart=always
RestartSec=3
# sandboxing: the app can only write to its data folder
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
UMask=0077

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable daily-closing
systemctl restart daily-closing

say "8/8  HTTPS (Caddy) for $DOMAIN"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' >/etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
cat >/etc/caddy/Caddyfile <<EOF
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
	header -Server
	log {
		output file /var/log/caddy/access.log {
			roll_size 10mb
			roll_keep 5
		}
	}
}
EOF
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
systemctl enable caddy
systemctl reload caddy 2>/dev/null || systemctl restart caddy

sleep 3
if curl -fsS http://127.0.0.1:3000/healthz >/dev/null; then
  say "DONE ✔  Open:  https://$DOMAIN"
  echo "   First login: admin / admin123  → you will be asked to choose a new password."
  echo "   Logs:     sudo journalctl -u daily-closing -f"
  echo "   Backups:  $DATA_DIR/backups  (one per day, last 30 kept)"
else
  die "the app did not start — see: sudo journalctl -u daily-closing -n 50"
fi
