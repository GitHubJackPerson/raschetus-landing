#!/usr/bin/env bash
# Деплой лендинга на прод-VPS (raschetus.ru → /var/www/raschetus.ru).
# Требует только tar + ssh (rsync не нужен). Синкает статику и перезагружает nginx.
#
# Использование:
#   ./scripts/deploy.sh                       # хост из RASCHETUS_DEPLOY_HOST или дефолт
#   RASCHETUS_DEPLOY_HOST=prod-kz ./scripts/deploy.sh
#
# ВНИМАНИЕ: по правилам STPulse прод деплоится через CI/CD. Этот скрипт — для
# первичной раскатки/хотфиксов; штатно контент лучше катить через GitHub Actions
# (см. README, раздел «Деплой»).

set -euo pipefail

HOST="${RASCHETUS_DEPLOY_HOST:-root@72.56.247.99}"
DEST="/var/www/raschetus.ru"

cd "$(dirname "$0")/.."

echo "→ Деплой на ${HOST}:${DEST}"

tar -cf - index.html favicon.svg robots.txt sitemap.xml assets \
  | ssh "$HOST" "set -e
      mkdir -p '${DEST}'
      tar -C '${DEST}' -xf -
      chown -R root:root '${DEST}'
      find '${DEST}' -type d -exec chmod 755 {} +
      find '${DEST}' -type f -exec chmod 644 {} +
      nginx -t
      systemctl reload nginx"

echo "✓ Готово: https://raschetus.ru"
