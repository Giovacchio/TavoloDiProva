// Carica lo script di OGNI carta del database e segnala quelle che danno errore.
import { cards, lib, scripts, cardData, name } from "./harness.mjs";
const all = Object.keys(cards).map(Number); let bad = [], missing = new Set(), t0 = Date.now();
for (let off = 0; off < all.length; off += 1500) {
  const errors = []; let cur = 0;
  const h = lib.createDuel({ flags: 190464n | 16n, seed: [1n, 2n, 3n, 4n], team1: { startingLP: 8000, startingDrawCount: 5, drawCountPerTurn: 1 }, team2: { startingLP: 8000, startingDrawCount: 5, drawCountPerTurn: 1 },
    cardReader: (c) => cardData(c), scriptReader: (n) => { const b = n.split("/").pop(); if (scripts[b] == null) missing.add(b + " (per " + name(cur) + ")"); return scripts[b] ?? null; }, errorHandler: (t, x) => errors.push([cur, String(x)]) });
  for (const b of ["constant.lua", "utility.lua"]) lib.loadScript(h, b, scripts[b]);
  for (const c of all.slice(off, off + 1500)) { cur = c; const isX = cards[c][2] & (0x40 | 0x2000 | 0x800000 | 0x4000000); lib.duelNewCard(h, { team: 0, duelist: 0, code: c, controller: 0, location: isX ? 64 : 1, sequence: 0, position: 2 }); }
  bad.push(...errors); lib.destroyDuel(h);
}
console.log(`carte caricate: ${all.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`errori: ${bad.length}`); for (const [c, e] of bad.slice(0, 25)) console.log("  ", c, name(c), "→", e.slice(0, 200));
console.log(`script mancanti richiesti: ${missing.size}`, [...missing].slice(0, 20));
const eff = [...missing].filter((m) => { const c = m.match(/^c(\d+)/)[1]; const r = cards[c]; return r && (r[2] & 0x26) && !(r[2] & 0x4000); });
console.log("mancanti per carte con effetto:", eff.length, eff.slice(0, 10));
console.log("alt-art caricata da alias?", [...missing].some((m) => m.startsWith("c64866.")));
