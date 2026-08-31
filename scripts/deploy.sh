#!/usr/bin/env bash
# Ручной деплой лендинга на прод-VPS (raschetus.ru → /var/www/raschetus.ru).
# Требует только tar + ssh (rsync не нужен). Статика — reload nginx не нужен.
#
# Использование:
#   RASCHETUS_DEPLOY_HOST=prod-kz ./scripts/deploy.sh   # root-хост для chown
#
# ШТАТНЫЙ путь — GitHub Actions (push в main → .github/workflows/deploy.yml).
# Этот скрипт — фолбэк для хотфиксов, когда CI недоступен. Требует root на хосте
# (для chown в deploy-rasch); поэтому дефолтный HOST — root@…, а не deploy-rasch.

set -euo pipefail

HOST="${RASCHETUS_DEPLOY_HOST:-root@72.56.247.99}"
DEST="/var/www/raschetus.ru"

cd "$(dirname "$0")/.."

echo "→ Деплой на ${HOST}:${DEST}"

tar -cf - index.html favicon.svg robots.txt sitemap.xml assets \
  | ssh "$HOST" "set -e
      mkdir -p '${DEST}'
      tar -C '${DEST}' -xf -
      chown -R deploy-rasch:deploy-rasch '${DEST}'
      find '${DEST}' -type d -exec chmod 755 {} +
      find '${DEST}' -type f -exec chmod 644 {} +"

echo "✓ Готово: https://raschetus.ru"
