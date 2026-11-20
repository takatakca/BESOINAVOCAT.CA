#!/usr/bin/env python3
"""Génère les pages publiques /confidentialite, /conditions et /suppression-compte du portail à partir de docs/legal/*.md.
Usage : python3 scripts/legal-pages.py   (sans dépendance; Markdown simple : titres, paragraphes, listes, gras, italique, code, liens)."""
import html, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [('POLITIQUE-DE-CONFIDENTIALITE.md', 'confidentialite.html', 'Politique de confidentialité'),
         (('CONDITIONS-CLIENTS.md', 'CONDITIONS-AVOCATS.md'), 'conditions.html', 'Conditions d’utilisation'),
         ('SUPPRESSION-DE-COMPTE.md', 'suppression-compte.html', 'Supprimer votre compte ou vos données')]

def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*([^*]+)\*(?!\*)', r'<em>\1</em>', t)
    t = re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', lambda m: f'<a href="mailto:{m.group(0)}">{m.group(0)}</a>', t)
    return t

def convert(md):
    out, para, lst = [], [], None
    def flush():
        nonlocal para, lst
        if para: out.append(f'<p>{inline(" ".join(para))}</p>'); para = []
        if lst is not None: out.append('<ul>' + ''.join(f'<li>{inline(i)}</li>' for i in lst) + '</ul>'); lst = None
    for line in md.splitlines():
        if not line.strip(): flush(); continue
        if line.startswith('#'):
            flush(); level = len(line) - len(line.lstrip('#')); out.append(f'<h{level}>{inline(line[level:].strip())}</h{level}>'); continue
        if re.match(r'^\s*- ', line):
            if para: out.append(f'<p>{inline(" ".join(para))}</p>'); para = []
            if lst is None: lst = []
            lst.append(line.split('- ', 1)[1]); continue
        if lst is not None and line.startswith('  '):
            lst[-1] += ' ' + line.strip(); continue
        if line.strip() == '---': flush(); continue
        if lst is not None: flush()
        para.append(line.strip())
    flush()
    return '\n'.join(out)

for source, target, title in PAGES:
    sources = source if isinstance(source, tuple) else (source,)
    body = '\n'.join(convert((ROOT / 'docs/legal' / s).read_text(encoding='utf-8')) for s in sources)
    source = ' + '.join(sources)
    page = f'''<!doctype html>
<html lang="fr-CA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="theme-color" content="#f8f6ef">
  <title>{html.escape(title)} | BesoinAvocat</title>
  <link rel="stylesheet" href="/aide.css">
</head>
<body>
  <!-- Généré par scripts/legal-pages.py à partir de docs/legal/{source}. Ne pas modifier à la main. -->
  <header class="top">
    <div class="wrap">
      <a href="/" aria-label="Portail BesoinAvocat"><img src="/brand/besoinavocat-logo.png" width="204" height="36" alt="BesoinAvocat"></a>
      <nav aria-label="Pages"><a href="/confidentialite">Confidentialité</a><a href="/conditions">Conditions</a><a href="/aide">Aide</a></nav>
    </div>
  </header>
  <main class="wrap legal">
{body}
  </main>
  <footer><div class="wrap">BesoinAvocat · <a href="/confidentialite">Confidentialité</a> · <a href="/conditions">Conditions</a> · <a href="/aide">Aide</a> · <a href="/">Portail</a></div></footer>
</body>
</html>
'''
    (ROOT / 'platform/public' / target).write_text(page, encoding='utf-8')
    print('écrit', target)
