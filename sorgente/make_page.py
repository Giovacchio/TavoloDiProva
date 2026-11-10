# Costruisce le due versioni della pagina a partire da page.src.html + core.js:
#  - site/index.html   : frammento per la pubblicazione dentro Claude (la pagina viene incartata da Claude)
#  - pages/index.html  : pagina completa per GitHub Pages, più tutti i file che servono, senza immagini
import re, os, shutil, json
B, SITE, PAGES = "/home/claude/build", "/home/claude/site", "/home/claude/pages"
core = open(f"{SITE}/core.js", encoding="utf-8").read()
core_inl = re.sub(r"^export (const|function|class|let) ", lambda m: m.group(1) + " ", core, flags=re.M)
assert not re.search(r"^export ", core_inl, flags=re.M), "restano export in core.js"
page = open(f"{B}/page.src.html", encoding="utf-8").read()
assert page.count("/*__CORE__*/") == 1
frag = page.replace("/*__CORE__*/", core_inl)
open(f"{SITE}/index.html", "w", encoding="utf-8").write(frag)

# --- GitHub Pages
cut = frag.index('<div class="app" id="app">')
head, body = frag[:cut], frag[cut:]
head = head.replace("<title>Tavolo di Prova 2</title>", "<title>Tavolo di Prova</title>").replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
full = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Prova i tuoi mazzi Yu-Gi-Oh! da solo, con le regole di EDOPro: carica un file .ydk, pesca la mano, gioca il turno e ricomincia.">
<meta name="theme-color" content="#0d1317">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tavolo di Prova">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<style>:root{{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);box-sizing:border-box}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{head.strip()}
</head>
<body>
{body.strip()}
</body>
</html>
"""
if os.path.exists(PAGES): shutil.rmtree(PAGES)
os.makedirs(f"{PAGES}/engine"); os.makedirs(f"{PAGES}/sorgente/prove")
open(f"{PAGES}/index.html", "w", encoding="utf-8").write(full)
for f in ["cards.gz.b64.txt", "scripts.gz.b64.txt", "strings.json", "seed.json", "data-version.json"]: shutil.copy(f"{SITE}/{f}", f"{PAGES}/{f}")
for f in os.listdir(f"{SITE}/engine"):
    if f.endswith(".js") or f == "LICENSE.txt": shutil.copy(f"{SITE}/engine/{f}", f"{PAGES}/engine/{f}")
json.dump({"name": "Tavolo di Prova", "short_name": "Tavolo di Prova", "description": "Prova i tuoi mazzi Yu-Gi-Oh! da solo con le regole di EDOPro.", "lang": "it", "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
  "background_color": "#0d1317", "theme_color": "#0d1317", "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]},
  open(f"{PAGES}/manifest.webmanifest", "w"), ensure_ascii=False, indent=1)
for f in ["icon-192.png", "icon-512.png", "LICENSE", "README.md"]: shutil.copy(f"{B}/static/{f}", f"{PAGES}/{f}")
os.makedirs(f"{PAGES}/img"); open(f"{PAGES}/img/index.json", "w").write("[]")  # nessuna immagine dentro il sito: le scarica il browser
# codice sorgente (licenza AGPL: chi usa l'app deve poterlo avere)
shutil.copy(f"{SITE}/core.js", f"{PAGES}/sorgente/core.js"); shutil.copy(f"{B}/page.src.html", f"{PAGES}/sorgente/page.src.html")
shutil.copy(f"{B}/make_page.py", f"{PAGES}/sorgente/make_page.py"); shutil.copy(f"{B}/build_data.py", f"{PAGES}/sorgente/build_data.py")
for f in ["harness.mjs", "run_tests.mjs", "t_core.mjs", "t_random_decks.mjs", "t_load_all.mjs"]: shutil.copy(f"/home/claude/tests/{f}", f"{PAGES}/sorgente/prove/{f}")
n = sum(len(fs) for _, _, fs in os.walk(PAGES)); size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(PAGES) for f in fs)
print(f"site/index.html {len(frag)//1024} KB · pages/: {n} file, {size//1024} KB")
