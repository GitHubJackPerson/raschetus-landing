# Расчётус — лендинг

Маркетинговый лендинг для **raschetus.ru** — витрина сервиса аналитики прибыли
для селлеров Ozon (бренд **Расчётус**, v3-редизайн STPulse; приложение —
`app-stpulse.ru`).

Отдельный, но связанный со STPulse проект: своя кодовая база, свой деплой,
общий бренд и дизайн-токены (палитра Расчётуса, шрифт Geist).

## Что это

Чистый статический сайт — **без фреймворков, без сборки, без внешних запросов**.
Только HTML + CSS + минимальный vanilla-JS + локальные шрифты. Открывается
двойным кликом, разворачивается на любом статик-хостинге как есть.

Исходником послужил экспорт-прототип из Claude (`raschetus-landing-den.html` в
`STPulse/docs/Расчётус/`). Он был **сериализованным React-снапшотом внутри
Claude-бандлера** (самораспаковывающийся JS-рантайм + React с CDN unpkg +
DC-логика с данными). Всё это — «лишнее, чего не должно быть на фронте» — снято,
а вёрстка, дизайн-токены, тексты и SVG-панели перенесены в семантический HTML/CSS
вручную. Результат отдаёт тот же визуал без React, без CDN и без Claude-рантайма.

## Структура

```
raschetus-landing/
├── index.html            # весь контент (SEO-meta, OG, 6 «часов дня», финал)
├── favicon.svg           # ё-марка бренда
├── assets/
│   ├── styles.css        # дизайн-токены + все стили (тёмная тема по умолчанию, светлая — переключателем)
│   ├── app.js            # переключатель темы (persist) + прогресс-полоса по скроллу
│   └── fonts/            # Geist, self-hosted (variable woff2, 4 subset'а)
│       ├── geist-latin.woff2
│       ├── geist-latin-ext.woff2
│       ├── geist-cyrillic.woff2
│       └── geist-cyrillic-ext.woff2
└── README.md
```

## Локальный просмотр

Любой статический сервер (шрифты грузятся по относительным путям, `file://`
тоже работает, но сервер честнее):

```bash
cd raschetus-landing
python -m http.server 8080
# → http://localhost:8080
```

## Тема

Тёмная — по умолчанию (бренд dark-first). Переключатель ◐/◑ в шапке, выбор
сохраняется в `localStorage` (`rsh-theme`). Инлайновый скрипт в `<head>`
проставляет тему до первой отрисовки — вспышки нет.

## Деплой

Захостен на прод-VPS **72.56.247.99** (тот же nginx, что `app-stpulse.ru`).

- **Live:** https://raschetus.ru — HTTPS (Let's Encrypt, авто-продление certbot)
- **Репозиторий:** `GitHubJackPerson/raschetus-landing`
- **Файлы на сервере:** `/var/www/raschetus.ru/`
- **nginx vhost:** `deploy/server/nginx/raschetus.ru.conf` (источник правды в репо;
  на сервере — `/etc/nginx/sites-available/raschetus.ru`)
- **DNS:** `A raschetus.ru → 72.56.247.99`

Другие домены на этом IP (`app-stpulse.ru`, `docs.app-stpulse.ru`) не затронуты —
nginx разводит их по `server_name`.

### Обновить контент

```bash
./scripts/deploy.sh                        # tar+ssh синк статики + reload nginx
RASCHETUS_DEPLOY_HOST=prod-kz ./scripts/deploy.sh   # через SSH-alias
```

По правилам STPulse прод штатно катится через CI/CD. Автоматический выкат
(GitHub Actions → scp на сервер) можно повесить отдельно — нужен deploy-ключ на
сервере + секрет в репо (как `DEPLOY_SSH_KEY` в основных репозиториях). Пока
обновление — скриптом.

### Первичная раскатка (если сервер пересоздаётся)

1. `./scripts/deploy.sh` — залить файлы в `/var/www/raschetus.ru`.
2. Скопировать `deploy/server/nginx/raschetus.ru.conf` →
   `/etc/nginx/sites-available/raschetus.ru`, симлинк в `sites-enabled/`.
3. `certbot --nginx -d raschetus.ru` — сертификат + редирект 80→443.
4. `nginx -t && systemctl reload nginx`.

## Открытые вопросы

- **CI-деплой** — повесить GitHub Actions (push → scp), если нужен авто-выкат
  вместо `scripts/deploy.sh`.
- **www.raschetus.ru** — если нужен: `A www → 72.56.247.99` +
  `certbot --nginx -d raschetus.ru -d www.raschetus.ru`.
- **CTA «Подключить магазин»** — все три кнопки ведут на `https://app-stpulse.ru/`
  (регистрация в приложении может быть закрыта, `NUXT_PUBLIC_REGISTRATION_ENABLED=false`);
  кнопки помечены `data-cta="connect"`.

## Правки контента

Тексты «часов дня» и цифры в панелях — прямо в `index.html` (6 секций
`.moment`). Палитра и типографика — токены в начале `assets/styles.css`.
