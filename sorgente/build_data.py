import sqlite3, json, gzip, base64, os, sys, glob, re
SRC = "/home/claude/src"; OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
cdbs = ["cards.cdb"] + sorted(os.path.basename(p) for p in glob.glob(f"{SRC}/BabelCDB/release-*.cdb")) + \
       sorted(os.path.basename(p) for p in glob.glob(f"{SRC}/BabelCDB/prerelease-*.cdb") if "rush" not in p)
cards = {}
for name in cdbs:
    con = sqlite3.connect(f"file:{SRC}/BabelCDB/{name}?mode=ro", uri=True)
    n = 0
    for row in con.execute("select d.id,d.ot,d.alias,d.setcode,d.type,d.atk,d.def,d.level,d.race,d.attribute,t.name,t.desc,"
                           + ",".join(f"t.str{i}" for i in range(1, 17)) + " from datas d join texts t on t.id=d.id"):
        cid, ot, alias, setcode, typ, atk, df, level, race, attr, nm, desc = row[:12]
        strs = [s or "" for s in row[12:]]
        while strs and not strs[-1]: strs.pop()
        sc = setcode & 0xFFFFFFFFFFFFFFFF
        setcodes = [x for x in ((sc >> (16 * i)) & 0xFFFF for i in range(4)) if x]
        link = df if typ & 0x4000000 else 0
        cards[str(cid)] = [alias, setcodes, typ, level & 0xFF, attr, race, atk, 0 if typ & 0x4000000 else df, (level >> 24) & 0xFF, (level >> 16) & 0xFF, link, nm, desc, strs]
        n += 1
    print(name, n)
print("carte totali", len(cards))
scripts = {}
CS = f"{SRC}/CardScripts"
for p in glob.glob(f"{CS}/*.lua"):
    scripts[os.path.basename(p)] = open(p, encoding="utf-8").read()
for sub in ["official", "pre-release"]:
    for p in glob.glob(f"{CS}/{sub}/*.lua"):
        scripts[os.path.basename(p)] = open(p, encoding="utf-8").read()
# file di supporto richiamati da utility.lua ma tenuti in altre cartelle
for root in glob.glob(f"{CS}/*.lua"):
    for m in re.findall(r'Duel\.LoadScript\("([^"]+)"\)', open(root, encoding="utf-8").read()):
        if m not in scripts:
            hits = glob.glob(f"{CS}/**/{m}", recursive=True)
            if hits: scripts[m] = open(hits[0], encoding="utf-8").read(); print("supporto da", os.path.relpath(hits[0], CS))
            else: print("!! MANCA", m)
# carte ufficiali il cui script sta solo in pre-errata
for k in cards:
    f = f"c{k}.lua"
    if f not in scripts and os.path.exists(f"{CS}/pre-errata/{f}"):
        scripts[f] = open(f"{CS}/pre-errata/{f}", encoding="utf-8").read(); print("da pre-errata:", f, cards[k][11])
print("script", len(scripts))
ids = set(cards)
noscript = [c for c in cards if f"c{c}.lua" not in scripts and (cards[c][2] & 0x26) and not (cards[c][2] & 0x4000) and not cards[c][0]]
print("carte con effetto senza script (no alias):", len(noscript), noscript[:15])
def pack(obj, fn):
    raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    gz = gzip.compress(raw, 9, mtime=0)
    open(os.path.join(OUT, fn), "w").write(base64.b64encode(gz).decode())
    print(fn, "json", len(raw) // 1024, "KB  gz", len(gz) // 1024, "KB")
pack(cards, "cards.gz.b64.txt"); pack(scripts, "scripts.gz.b64.txt")
json.dump(cards, open("/home/claude/build/cards.json", "w"), ensure_ascii=False)
import subprocess, datetime
def head(d): return subprocess.run(["git", "-C", f"{SRC}/{d}", "log", "-1", "--format=%H|%cI"], capture_output=True, text=True).stdout.strip().split("|")
ver = {"built": datetime.date.today().isoformat(), "cards": len(cards), "scripts": len(scripts), "BabelCDB": head("BabelCDB"), "CardScripts": head("CardScripts"), "noscript": [cards[c][11] for c in noscript]}
json.dump(ver, open(os.path.join(OUT, "data-version.json"), "w")); print(ver)
