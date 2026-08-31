# Расчётус — лендинг

Маркетинговый лендинг для **raschetus.ru** — витрина сервиса **Расчётус**
(«автоматизатор прибыли» для продавцов Ozon; v3-редизайн STPulse, приложение —
`app-stpulse.ru`).

Отдельный, но связанный со STPulse проект: своя кодовая база, свой деплой,
общий бренд и дизайн-токены (палитра Расчётуса, шрифт Geist).

## Что это

Чистый статический сайт — **без фреймворков, без сборки**. Только HTML + CSS +
минимальный vanilla-JS + локальные шрифты + self-hosted OG-картинка. Единственный
внешний запрос — счётчик Яндекс.Метрики (аналитика, осознанное исключение).

Исходником послужил экспорт-прототип из Claude (`raschetus-landing-den.html` в
`STPulse/docs/Расчётус/`) — сериализованный React-снапшот внутри Claude-бандлера
(JS-рантайм + React с CDN + данные). Всё это снято, а вёрстка, токены, тексты и
SVG-панели перенесены в семантический HTML/CSS вручную. Тот же визуал без React,
CDN и рантайма.

## Контент (одна страница)

1. **Hero** — вопрос «Как увеличить прибыль?» + соц-доказательство
   «Уже 200+ селлеров нашли ответы и решения» + CTA «Подключить бесплатно».
2. **Чат «часы дня»** — 6 секций `.moment` (09:05 … 18:00): вопрос селлера →
   ответ Расчётуса с SVG-панелью. Каждая секция про свою фичу (Пульс,
   юнит-экономика, акции/автосценарии, подсорт по кластерам+FBS, карта логистики
   и сгоревшие склады, план и прогноз). Время — с иконкой часов.
3. **Офферы** (под чатом) — 3 карточки: единый тариф вне выручки, 5 сотрудников
   бесплатно, 5 дней бесплатно.
4. **Финал** — мотто «Посчитано. Сходится. Точка.» + CTA «Протестировать
   бесплатно».
5. **Подвал** — слоган, ссылки (Оферта / Политика / Поддержка), реквизиты
   (ИП / ИНН / ОГРНИП), продающая строка «Считайте деньги. Растите прибыль.».

## Структура

```
raschetus-landing/
├── index.html            # весь контент + SEO-meta, OG, JSON-LD, Яндекс.Метрика
├── favicon.svg           # ё-марка (чёрный ё на лайме)
├── robots.txt            # Allow + ссылка на sitemap
├── sitemap.xml           # 1 URL + image-расширение
├── assets/
│   ├── styles.css        # дизайн-токены + все стили (тёмная тема по умолчанию, светлая — переключателем)
│   ├── app.js            # тема (persist) + прогресс-полоса по скроллу + чат-анимация (печатная машинка)
│   ├── img/
│   │   ├── badge.svg     # ё-в-квадрате (аватар Расчётуса в чате)
│   │   └── og.png        # OG-превью 1200×630 (self-hosted, генерится headless-шаблоном)
│   └── fonts/            # Geist, self-hosted (variable woff2, 4 subset'а)
├── deploy/server/nginx/raschetus.ru.conf   # nginx vhost (источник правды)
├── scripts/deploy.sh     # ручной фолбэк-деплой
├── .github/workflows/deploy.yml            # CI-деплой
└── README.md
```

## Анимация чата

При `prefers-reduced-motion: off` (флаг `html.anim` ставится в `<head>`) каждый
диалог по мере прокрутки проигрывается как чат: вопрос печатается по буквам →
индикатор «…» → Расчётус печатает заголовок ответа → тело + панель проявляются.
`IntersectionObserver` + safety-net на `load` (первый видимый диалог анимируется,
даже если initial-callback IO задержался). При reduced-motion / без IO — всё видно
сразу, тексты целые (важно для краулеров).

## Тема

Тёмная — по умолчанию (бренд dark-first). Переключатель ◐/◑ в шапке, выбор в
`localStorage` (`rsh-theme`). Инлайновый скрипт в `<head>` проставляет тему до
первой отрисовки — вспышки нет.

## SEO

- **Title/description** — описательные, keyword-rich (аналитика Ozon, реальная
  прибыль, юнит-экономика, себестоимость, поставки, акции).
- **JSON-LD** (`@graph`): `Organization` + `WebSite` + `SoftwareApplication` +
  **`FAQPage`** (6 вопросов-ответов = диалоги чата). **Тексты FAQ в JSON-LD
  синхронизированы с видимыми** — правишь диалог, правь и соответствующий блок.
- **OG / Twitter** — карточка `summary_large_image`, картинка `assets/img/og.png`.
- **robots.txt** (Allow) + **sitemap.xml** (+ image), canonical, `robots` meta
  (`max-image-preview:large`).

**Перегенерировать OG-картинку** (при смене слогана/цветов): headless-шаблон,
`chrome --headless --screenshot`, размер 1200×630, вывод в `assets/img/og.png`
(шаблон — в истории коммитов; собирается из тех же токенов/шрифтов).

## Аналитика

**Яндекс.Метрика** id `112116470` (webvisor, clickmap, ecommerce) — в `<head>`,
единственный внешний запрос. `preconnect` к `mc.yandex.ru`.

## Индексация (готово)

- **Google Search Console** — ресурс-домен подтверждён (DNS TXT
  `google-site-verification`), sitemap отправлен полным URL
  `https://raschetus.ru/sitemap.xml`.
- **Яндекс.Вебмастер** — подтверждён (мета `yandex-verification: 8f85b2d57e4718c3`
  в `<head>` + DNS TXT), sitemap + переобход.

DNS TXT-записи подтверждения удалять нельзя.

## Деплой

Захостен на прод-VPS **72.56.247.99** (тот же nginx, что `app-stpulse.ru`).

- **Live:** https://raschetus.ru (и `www` → 301 на apex)
- **HTTPS:** Let's Encrypt, SAN `raschetus.ru` + `www`, авто-продление certbot
- **Репозиторий:** `GitHubJackPerson/raschetus-landing`
- **Файлы на сервере:** `/var/www/raschetus.ru/` (владелец `deploy-rasch`)
- **nginx vhost:** `deploy/server/nginx/raschetus.ru.conf` (на сервере —
  `/etc/nginx/sites-available/raschetus.ru`)
- **DNS:** `A raschetus.ru → 72.56.247.99`, `A www → 72.56.247.99`

Другие домены на этом IP не затронуты — nginx разводит по `server_name`.

### Обновить контент — штатно через CI

Push в `main` → `.github/workflows/deploy.yml` стейджит статику
(`index.html favicon.svg robots.txt sitemap.xml assets` → `_site/`) и rsync'ит в
`/var/www/raschetus.ru` под непривилегированным **`deploy-rasch`** (пишет только
в каталог сайта; root и reload nginx не нужны).

Секрет: `DEPLOY_SSH_KEY` — задан в репо.

### Ручной фолбэк (если CI недоступен)

```bash
RASCHETUS_DEPLOY_HOST=prod-kz ./scripts/deploy.sh   # tar+ssh, требует root на хосте
```

### Первичная раскатка (если сервер пересоздаётся)

1. Создать `deploy-rasch`, публичный ключ в `authorized_keys`, отдать ему
   `/var/www/raschetus.ru`.
2. `deploy/server/nginx/raschetus.ru.conf` → `sites-available` + симлинк в
   `sites-enabled`.
3. `certbot certonly --nginx -d raschetus.ru -d www.raschetus.ru --expand`.
4. `nginx -t && systemctl reload nginx`, затем `./scripts/deploy.sh`.

## Правки контента

- Тексты диалогов и цифры в панелях — в `index.html` (6 секций `.moment`).
  **При правке текста диалога синхронизируй FAQ-блок в JSON-LD** (`<head>`).
- Офферы — секция `.offers` (3 карточки `.offer`).
- Палитра и типографика — токены в начале `assets/styles.css`.
- Все три CTA ведут на `https://app-stpulse.ru/`, помечены `data-cta="connect"`.
