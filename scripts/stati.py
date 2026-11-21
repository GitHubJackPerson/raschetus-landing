#!/usr/bin/env python3
"""Build the /stati/ section: article pages and the list page.

Sources live in scripts/stati-src/<slug>.html: an HTML comment with JSON metadata
(`<!--meta {...} -->`) followed by the article body. The page header and footer are
copied from postavki/index.html so the section always matches the landing chrome.

Usage: python scripts/stati.py   (writes stati/index.html and stati/<slug>/index.html)
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "stati-src"
OUT = ROOT / "stati"
SITE = "https://raschetus.ru"
REGISTER = "https://mp.raschetus.ru/register?utm_source=site&utm_medium=article&utm_campaign="
MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
          "сентября", "октября", "ноября", "декабря"]


def chrome():
    page = (ROOT / "postavki" / "index.html").read_text(encoding="utf-8")
    header = re.search(r'<header class="day-strip">.*?</header>', page, re.S).group(0)
    footer = re.search(r'<footer class="footer">.*?</footer>', page, re.S).group(0)
    tail = page[page.index("</footer>") + len("</footer>"):page.index("</body>")]
    # The section link sits next to the knowledge base in the "Компания" column.
    footer = footer.replace(
        '<a href="/docs/" target="_blank" rel="noopener">База знаний</a>',
        '<a href="/docs/" target="_blank" rel="noopener">База знаний</a>\n        <a href="/stati/">Статьи</a>', 1)
    return header, footer, tail


def human_date(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


def plain(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def words(fragment):
    return len(re.findall(r"[0-9A-Za-zА-Яа-яЁё%₽]+(?:[-–][0-9A-Za-zА-Яа-яЁё]+)*", plain(fragment)))


def load():
    arts = []
    for f in sorted(SRC.glob("*.html")):
        raw = f.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
        if not m:
            sys.exit(f"{f.name}: no meta block")
        meta = json.loads(m.group(1))
        meta["body"] = raw[m.end():].strip()
        meta["slug"] = f.stem
        arts.append(meta)
    arts.sort(key=lambda a: (a["published"], a.get("order", 0)), reverse=True)
    return arts


def add_ids(body):
    """Give every <h2> an id and return (body, [(id, text)]) for the contents block."""
    toc = []

    def sub(m):
        attrs, inner = m.group(1), m.group(2)
        idm = re.search(r'id="([^"]+)"', attrs)
        hid = idm.group(1) if idm else f"s{len(toc) + 1}"
        toc.append((hid, plain(inner)))
        return m.group(0) if idm else f'<h2 id="{hid}"{attrs}>{inner}</h2>'

    return re.sub(r"<h2([^>]*)>(.*?)</h2>", sub, body, flags=re.S), toc


def head(title, desc, url, og_title, og_desc, image, ld, extra_css, keywords, og_type):
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(desc)}">
  <meta name="theme-color" content="#0e1110">
  <meta name="color-scheme" content="dark light">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta name="keywords" content="{html.escape(keywords)}">
  <meta name="author" content="Расчётус">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/badge.svg">
  <link rel="canonical" href="{url}">
  <link rel="preconnect" href="https://mc.yandex.ru" crossorigin>

  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="Расчётус">
  <meta property="og:title" content="{html.escape(og_title)}">
  <meta property="og:description" content="{html.escape(og_desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:image" content="{image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(og_title)}">
  <meta name="twitter:description" content="{html.escape(og_desc)}">
  <meta name="twitter:image" content="{image}">

  <script>
    (function () {{ try {{ if ((localStorage.getItem('rsh-theme') || 'dark') === 'light') document.documentElement.classList.add('light'); }} catch (e) {{}} }})();
  </script>

  <link rel="preload" href="/assets/fonts/geist-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css?v=20260906">

  <script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
  </script>

  <style>
{extra_css}
  </style>
</head>"""


CSS = """    .art { max-width: var(--maxw); margin-inline: auto; padding: clamp(28px,5vw,64px) clamp(16px,4vw,52px); }
    .art__crumbs { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--mut); }
    .art__crumbs a { color: var(--mut); text-decoration: none; }
    .art__crumbs a:hover { color: var(--lime-tx); }
    .art__h1 { font-size: clamp(28px,4.6vw,50px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; color: var(--tx); max-width: 22ch; margin-top: 12px; }
    .art__meta { color: var(--mut); font-size: 13px; margin-top: 14px; }
    .art__lead { color: var(--tx2); font-size: clamp(15px,1.6vw,19px); line-height: 1.55; max-width: 64ch; margin-top: 16px; }
    .post { max-width: 74ch; }
    .post h2 { font-size: clamp(21px,2.6vw,30px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.12; color: var(--tx); margin-top: clamp(30px,4vw,48px); scroll-margin-top: 80px; }
    .post h3 { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: var(--tx); margin-top: 24px; }
    .post p, .post li { color: var(--tx2); font-size: 16px; line-height: 1.7; }
    .post p { margin-top: 12px; }
    .post ul, .post ol { margin-top: 10px; padding-left: 22px; }
    .post li { margin-top: 6px; }
    .post strong { color: var(--tx); }
    .post a { color: var(--lime-tx); }
    .post code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .92em; background: var(--soft); padding: 1px 5px; border-radius: 4px; }
    .post .formula { margin-top: 14px; padding: 14px 18px; border-left: 3px solid var(--lime); background: var(--tint); border-radius: 0 10px 10px 0; color: var(--tx); font-weight: 600; font-size: 16px; line-height: 1.6; }
    .post .note { margin-top: 16px; padding: 14px 18px; border: 1px solid var(--hair2); border-radius: 12px; background: var(--gr2); }
    .post .note p:first-child { margin-top: 0; }
    .post .note__h { color: var(--tx); font-weight: 700; font-size: 14px; letter-spacing: .02em; text-transform: uppercase; }
    .post .tbl { margin-top: 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .post table { border-collapse: collapse; min-width: 100%; font-size: 14px; }
    .post th, .post td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--hair); color: var(--tx2); vertical-align: top; }
    .post th { color: var(--tx); font-weight: 700; border-bottom-color: var(--hair2); white-space: nowrap; }
    .post td.num, .post th.num { text-align: right; white-space: nowrap; }
    .toc { margin-top: 26px; padding: 16px 20px; border: 1px solid var(--hair2); border-radius: 12px; max-width: 74ch; background: var(--gr2); }
    .toc__h { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--mut); font-weight: 700; }
    .toc ol { margin-top: 8px; padding-left: 20px; }
    .toc li { color: var(--tx2); font-size: 14px; line-height: 1.5; margin-top: 4px; }
    .toc a { color: var(--tx2); text-decoration: none; }
    .toc a:hover { color: var(--lime-tx); }
    .try { margin-top: clamp(34px,5vw,56px); max-width: 74ch; padding: clamp(20px,3vw,30px); border-radius: 16px; background: var(--tint); border: 1px solid var(--tint2); }
    .try__h { font-size: clamp(20px,2.4vw,26px); font-weight: 800; letter-spacing: -0.03em; color: var(--tx); }
    .try p { color: var(--tx2); font-size: 15px; line-height: 1.6; margin-top: 8px; }
    .try__cta { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-top: 18px; }
    .more { margin-top: clamp(34px,5vw,56px); max-width: 74ch; }
    .more__h { font-size: 18px; font-weight: 800; color: var(--tx); }
    .more ul { list-style: none; margin-top: 10px; }
    .more li { border-bottom: 1px solid var(--hair); }
    .more a { display: block; padding: 12px 0; color: var(--tx2); text-decoration: none; font-weight: 600; }
    .more a:hover { color: var(--lime-tx); }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-top: clamp(24px,4vw,40px); }
    .card { display: flex; flex-direction: column; padding: 22px; border: 1px solid var(--hair2); border-radius: 16px; background: var(--gr2); text-decoration: none; transition: border-color .15s ease; }
    .card:hover { border-color: var(--lime-tx); }
    .card__tag { font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: var(--lime-tx); font-weight: 700; }
    .card__h { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; color: var(--tx); margin-top: 10px; }
    .card__p { color: var(--tx2); font-size: 14px; line-height: 1.55; margin-top: 10px; flex: 1; }
    .card__meta { color: var(--mut); font-size: 13px; margin-top: 16px; }
    @media (max-width: 520px) { .post p, .post li { font-size: 15px; } .post table { font-size: 13px; } }"""


def faq_block(faq):
    items = "\n".join(
        f"""        <details class="faq">
          <summary>{html.escape(q)}</summary>
          <p>{a}</p>
        </details>""" for q, a in faq)
    return f"""  <section class="caps" aria-label="Частые вопросы">
    <div class="caps__inner">
      <h2 class="caps__faq-h">Частые вопросы</h2>
      <div class="faqs">
{items}
      </div>
    </div>
  </section>
"""


def build_article(a, arts, header, footer, tail):
    url = f"{SITE}/stati/{a['slug']}/"
    body, toc = add_ids(a["body"])
    n_words = words(body) + words(a["lead"]) + sum(words(q) + words(x) for q, x in a.get("faq", []))
    minutes = max(1, round(n_words / 180))
    image = f"{SITE}{a['image']}"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": f"{url}#article",
                "headline": a["h1"],
                "description": a["description"],
                "url": url,
                "mainEntityOfPage": url,
                "inLanguage": "ru-RU",
                "datePublished": a["published"],
                "dateModified": a.get("modified", a["published"]),
                "image": image,
                "wordCount": n_words,
                "articleSection": "Статьи",
                "keywords": a["keywords"],
                "author": {"@type": "Organization", "name": "Расчётус", "url": f"{SITE}/"},
                "publisher": {"@type": "Organization", "name": "Расчётус", "url": f"{SITE}/",
                              "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/img/badge.svg"}},
                "isPartOf": {"@id": f"{SITE}/#website"},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
                    {"@type": "ListItem", "position": 2, "name": "Статьи", "item": f"{SITE}/stati/"},
                    {"@type": "ListItem", "position": 3, "name": a["crumb"], "item": url},
                ],
            },
        ],
    }
    if a.get("faq"):
        ld["@graph"].append({
            "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": plain(x)}} for q, x in a["faq"]],
        })
    toc_html = "\n".join(f'        <li><a href="#{i}">{html.escape(t)}</a></li>' for i, t in toc)
    others = [o for o in arts if o["slug"] != a["slug"]][:3]
    more = "\n".join(f'        <li><a href="/stati/{o["slug"]}/">{html.escape(o["h1"])} →</a></li>' for o in others)
    land = a["landing"]
    page = head(a["title"], a["description"], url, a["og_title"], a.get("og_description", a["description"]),
                image, ld, CSS, a["keywords"], "article")
    page += f"""
<body>

  {header}

  <main class="art">
    <nav class="art__crumbs" aria-label="Хлебные крошки">
      <a href="/">Главная</a> → <a href="/stati/">Статьи</a> → {html.escape(a['crumb'])}
    </nav>

    <article>
      <h1 class="art__h1">{a['h1']}</h1>
      <p class="art__meta"><time datetime="{a['published']}">{human_date(a['published'])}</time> · {minutes} мин чтения</p>
      <p class="art__lead">{a['lead']}</p>

      <nav class="toc" aria-label="Содержание">
        <div class="toc__h">Содержание</div>
        <ol>
{toc_html}
        </ol>
      </nav>

      <div class="post">
{body}
      </div>
    </article>

    <aside class="try" aria-label="Посчитать на своих данных">
      <div class="try__h">Посчитать на своих данных</div>
      <p>{a['cta_text']}</p>
      <p>5&nbsp;дней полного доступа без привязки карты: подключите магазин Ozon по ключу Seller API — отчёты соберутся из ваших продаж.</p>
      <div class="try__cta">
        <a href="{REGISTER}{a['slug']}" class="btn btn--lime btn--lg" data-cta="connect">Попробовать 5 дней бесплатно</a>
        <a href="{land['href']}" class="hero__link" data-cta="landing">{html.escape(land['label'])}&nbsp;→</a>
      </div>
    </aside>

    <nav class="more" aria-label="Другие статьи">
      <div class="more__h">Ещё статьи</div>
      <ul>
{more}
        <li><a href="/stati/">Все статьи →</a></li>
      </ul>
    </nav>
  </main>

{faq_block(a['faq']) if a.get('faq') else ''}
  {footer}
{tail}</body>
</html>
"""
    dest = OUT / a["slug"] / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page, encoding="utf-8", newline="\n")
    return n_words, minutes


LIST = {
    "title": "Статьи для продавцов Ozon — поставки, акции, реклама",
    "description": "Статьи Расчётуса для продавцов Ozon: как считать подсорт и поставки по кластерам, отключать автодобавление в акции, считать ДРР и окупаемость рекламы.",
    "h1": "Статьи для продавцов Ozon",
    "lead": "Разбираем, как считать то, от чего зависит прибыль на маркетплейсе: поставки, акции, рекламу. "
            "С формулами, условными примерами и ссылками на правила Ozon.",
}


def build_list(arts, minutes, header, footer, tail):
    url = f"{SITE}/stati/"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": LIST["h1"],
                "description": LIST["description"],
                "inLanguage": "ru-RU",
                "isPartOf": {"@id": f"{SITE}/#website"},
                "mainEntity": {
                    "@type": "ItemList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/stati/{a['slug']}/", "name": a["h1"]}
                        for i, a in enumerate(arts)],
                },
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
                    {"@type": "ListItem", "position": 2, "name": "Статьи", "item": url},
                ],
            },
        ],
    }
    cards = "\n".join(f"""      <a class="card" href="/stati/{a['slug']}/">
        <span class="card__tag">{html.escape(a['tag'])}</span>
        <h2 class="card__h">{html.escape(a['h1'])}</h2>
        <span class="card__p">{html.escape(a['description'])}</span>
        <span class="card__meta">{human_date(a['published'])} · {minutes[a['slug']]} мин чтения</span>
      </a>""" for a in arts)
    page = head(LIST["title"], LIST["description"], url, LIST["h1"], LIST["description"],
                f"{SITE}/assets/img/og.png", ld, CSS, "статьи Ozon, подсорт Ozon, поставки по кластерам, автодобавление в акции Ozon, ДРР Ozon",
                "website")
    page += f"""
<body>

  {header}

  <main class="art">
    <nav class="art__crumbs" aria-label="Хлебные крошки">
      <a href="/">Главная</a> → Статьи
    </nav>
    <h1 class="art__h1">{LIST['h1']}</h1>
    <p class="art__lead">{LIST['lead']}</p>
    <div class="cards">
{cards}
    </div>
    <div class="try" aria-label="Посчитать на своих данных">
      <div class="try__h">Посчитать на своих данных</div>
      <p>Расчётус собирает поставки, акции, рекламу и прибыль по каждому товару из кабинета Ozon. 5&nbsp;дней полного доступа без привязки карты.</p>
      <div class="try__cta">
        <a href="{REGISTER}stati" class="btn btn--lime btn--lg" data-cta="connect">Попробовать 5 дней бесплатно</a>
        <a href="/docs/" class="hero__link" target="_blank" rel="noopener">База знаний →</a>
      </div>
    </div>
  </main>

  {footer}
{tail}</body>
</html>
"""
    (OUT / "index.html").write_text(page, encoding="utf-8", newline="\n")


def main():
    header, footer, tail = chrome()
    arts = load()
    minutes = {}
    for a in arts:
        for key in ("title", "description"):
            if key == "title" and len(a[key]) > 60:
                sys.exit(f"{a['slug']}: title {len(a[key])} > 60")
            if key == "description" and len(a[key]) > 158:
                sys.exit(f"{a['slug']}: description {len(a[key])} > 158")
        n, minutes[a["slug"]] = build_article(a, arts, header, footer, tail)
        print(f"{a['slug']}: {n} words, title {len(a['title'])}, description {len(a['description'])}")
    build_list(arts, minutes, header, footer, tail)
    print(f"list: title {len(LIST['title'])}, description {len(LIST['description'])}")


if __name__ == "__main__":
    main()
