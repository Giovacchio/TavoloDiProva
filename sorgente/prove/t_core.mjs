// Prove sulla logica dell'app (core.js): mano scelta, mescolata, annulla, e partite a caso su entrambi i mazzi.
import { cards, scripts, lib, readYdk, code as C, name } from "./harness.mjs";
import fs from "node:fs";
import { CardDB, Session, parseDeckText, deckWarnings, M, R, LOC, autoResponse, freePlaces, actionsFor } from "/home/claude/site/core.js";
const db = new CardDB(cards, JSON.parse(fs.readFileSync("/home/claude/site/strings.json", "utf8")));
let fails = 0; const ok = (c, m) => { console.log(`${c ? "ok " : "NO "} ${m}`); if (!c) fails++; };
const decks = { tear: readYdk("tear.ydk"), maliss: readYdk("maliss.ydk") };
const names = (s, p, l) => s.zone(p, l).filter((q) => q && q.code).map((q) => name(q.code));

// --- importazione
for (const f of ["tear.ydk", "maliss.ydk"]) { const r = parseDeckText(db, fs.readFileSync(f, "utf8")); ok(r.miss.length === 0 && r.main.length >= 40 && r.extra.length === 15, `${f}: importato ${r.main.length}+${r.extra.length}, nessuna carta sconosciuta, avvisi: ${deckWarnings(db, r).length}`); }
{ const r = parseDeckText(db, "3 Ash Blossom & Joyous Spring\nTearlaments Kitkallos x1\n2x Maxx \"C\"\nCarta Inventata\n"); ok(r.main.length === 5 && r.extra.length === 1 && r.miss.length === 1, `lista incollata per nome: ${r.main.length} main, ${r.extra.length} extra, non trovate: ${r.miss}`); }

// --- mano scelta + mescolata vera + stesso seme = stessa partita
{ const forced = ["Polymerization", "King of the Swamp", "Tearlaments Reinoheart"].map(C);
  const mk = (seed) => { const s = new Session(lib, db, scripts); s.start({ ...decks.tear, forced, seed }); return s; };
  const a = mk(123), b = mk(123), c = mk(999);
  const ha = names(a, 0, LOC.HAND), hb = names(b, 0, LOC.HAND), hc = names(c, 0, LOC.HAND);
  ok(ha.length === 5 && ha.includes("Polymerization") && ha.includes("King of the Swamp"), "mano scelta: 5 carte con Polimerizzazione e King → " + ha.join(", "));
  ok(a.count(0, LOC.DECK) === 37 && a.count(0, LOC.EXTRA) === 15, "mazzo 37, Extra 15 dopo la pescata");
  ok(JSON.stringify(ha) === JSON.stringify(hb), "stesso seme → stessa mano (serve per Annulla)");
  ok(JSON.stringify(ha) !== JSON.stringify(hc), "seme diverso → mano diversa: " + hc.join(", "));
  ok(a.pending && a.pending.type === M.SELECT_IDLECMD && a.turn === 1 && a.errors.length === 0, "la partita arriva alla Main Phase del turno 1 senza errori");
  // annulla: gioco Polimerizzazione fino in fondo, poi annullo tutto passo per passo
  const snap = () => JSON.stringify([names(a, 0, LOC.HAND), names(a, 0, LOC.MZONE), names(a, 0, LOC.GRAVE), a.count(0, LOC.DECK)]);
  const s0 = snap(); let ask = a.pending; const i = ask.activates.findIndex((x) => name(x.code) === "Polymerization");
  ask = a.respond({ type: R.IDLECMD, action: 5, index: i }); let steps = 1;
  while (ask && ask.type !== M.SELECT_IDLECMD && steps < 30) { ask = a.respond(ask.type === M.SELECT_EFFECTYN ? { type: R.EFFECTYN, yes: false } : autoResponse(ask)); steps++; }
  ok(names(a, 0, LOC.MZONE).length === 1, `Polimerizzazione giocata in ${a.moves} mosse → in campo ${names(a, 0, LOC.MZONE)}`);
  const s1 = snap(), m1 = a.moves; a.undo(); const s2 = snap(), m2 = a.moves; let n = 0; while (a.moves > 0 && n++ < 40) a.undo();
  ok(m2 === m1 - 1 && snap() === s0 && a.pending.type === M.SELECT_IDLECMD, "Annulla torna indietro di una mossa alla volta fino alla mano iniziale");
  // risposta non valida: il motore la rifiuta e lo stato non cambia
  const before = snap(); a.respond({ type: R.IDLECMD, action: 5, index: 99 });
  ok(a.invalid && snap() === before && a.pending.type === M.SELECT_IDLECMD, "una risposta non valida viene rifiutata senza rompere la partita");
}

// --- partite a caso: ogni richiesta riceve una risposta legale a caso; cerco errori, blocchi, rifiuti
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function randomResponse(a, r) {
  const pickN = (n, k) => { const idx = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx.slice(0, k); };
  switch (a.type) {
    case M.SELECT_IDLECMD: { const all = [];
      a.summons.forEach((_, i) => all.push({ type: R.IDLECMD, action: 0, index: i })); a.special_summons.forEach((_, i) => all.push({ type: R.IDLECMD, action: 1, index: i }));
      a.activates.forEach((_, i) => { for (let k = 0; k < 3; k++) all.push({ type: R.IDLECMD, action: 5, index: i }); });
      a.spell_sets.forEach((_, i) => all.push({ type: R.IDLECMD, action: 4, index: i })); a.monster_sets.forEach((_, i) => all.push({ type: R.IDLECMD, action: 3, index: i })); a.pos_changes.forEach((_, i) => all.push({ type: R.IDLECMD, action: 2, index: i }));
      if (!all.length || r() < 0.04) return { type: R.IDLECMD, action: a.to_ep ? 7 : 6, index: null }; return all[Math.floor(r() * all.length)]; }
    case M.SELECT_BATTLECMD: return { type: R.BATTLECMD, action: a.to_ep ? 3 : 2, index: null };
    case M.SELECT_EFFECTYN: return { type: R.EFFECTYN, yes: r() < 0.85 };
    case M.SELECT_YESNO: return { type: R.YESNO, yes: r() < 0.7 };
    case M.SELECT_OPTION: return { type: R.OPTION, index: Math.floor(r() * a.options.length) };
    case M.SELECT_CHAIN: return { type: R.CHAIN, index: a.forced || r() < 0.85 ? Math.floor(r() * a.selects.length) : null };
    case M.SELECT_CARD: { const k = a.min + Math.floor(r() * (Math.min(a.max, a.selects.length) - a.min + 1)); return { type: R.CARD, indicies: pickN(a.selects.length, Math.max(k, 1)) }; }
    case M.SELECT_TRIBUTE: return { type: R.TRIBUTE, indicies: pickN(a.selects.length, Math.max(a.min, 1)) };
    case M.SELECT_UNSELECT_CARD: return { type: R.UNSELECT, index: a.can_finish && r() < 0.5 ? null : Math.floor(r() * a.select_cards.length) };
    case M.SELECT_PLACE: case M.SELECT_DISFIELD: { const f = freePlaces(a.field_mask, 0); return { type: a.type === M.SELECT_PLACE ? R.PLACE : R.DISFIELD, places: pickN(f.length, a.count).map((i) => f[i]) }; }
    case M.SELECT_POSITION: { const ps = [1, 4, 2, 8].filter((p) => a.positions & p); return { type: R.POSITION, position: ps[Math.floor(r() * ps.length)] }; }
    case M.ANNOUNCE_NUMBER: return { type: R.NUMBER, value: Math.floor(r() * a.options.length) };
    default: return autoResponse(a);
  }
}
const seen = new Map(); let totalMoves = 0, invalid = 0, stuck = 0, errs = new Map(), sums = 0, undoFail = 0;
const N = +(process.argv[2] || 150);
for (const [dn, deck] of Object.entries(decks)) for (let g = 0; g < N; g++) {
  const r = rnd(g * 7919 + (dn === "tear" ? 1 : 2)); const s = new Session(lib, db, scripts, { chainAll: g % 3 === 0, autoZoneMon: g % 2 === 0 });
  let ask = s.start({ ...deck, forced: [], seed: g + 1 }), moves = 0;
  while (ask && s.turn <= 1 && moves < 400) {
    seen.set(ask.type, (seen.get(ask.type) || 0) + 1);
    if (ask.type === M.SELECT_SUM) sums++;
    const resp = randomResponse(ask, r); ask = s.respond(resp); moves++;
    if (s.invalid) { invalid++; if (invalid <= 5) console.log("   rifiutata:", dn, g, JSON.stringify(resp, (k, v) => (typeof v === "bigint" ? String(v) : v)).slice(0, 200), "richiesta tipo", s.pending?.type); ask = s.respond(autoResponse(s.pending)); if (s.invalid) { stuck++; break; } }
    // ogni tanto: annulla e rifai la stessa mossa → deve portare allo stesso stato
    if (moves % 37 === 0 && ask && !s.invalid) { const snap = () => JSON.stringify([s.zone(0, LOC.HAND).map((q) => q?.code), s.zone(0, LOC.MZONE).map((q) => q?.code), s.zone(0, LOC.GRAVE).map((q) => q?.code), s.count(0, LOC.DECK), s.pending?.type]);
      const a1 = snap(); const last = s.responses.filter((x) => !x.auto).pop().r; s.undo(); s.respond(last); if (snap() !== a1) undoFail++; ask = s.pending; }
  }
  if (!ask && !s.ended) stuck++;
  for (const e of s.errors) errs.set(e.slice(0, 160), (errs.get(e.slice(0, 160)) || 0) + 1);
  totalMoves += moves; s.destroy();
}
console.log(`\npartite a caso: ${2 * N} (turno 1), mosse totali ${totalMoves}`);
console.log("tipi di richiesta incontrati:", [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${Object.keys(M).find((k) => M[k] === t)}×${n}`).join(", "));
ok(invalid === 0, `risposte rifiutate dal motore: ${invalid}`);
ok(stuck === 0, `partite bloccate: ${stuck}`);
ok(undoFail === 0, `annulla+rifai con stato diverso: ${undoFail}`);
ok(errs.size === 0, `errori del motore: ${errs.size}`); for (const [e, n] of [...errs].slice(0, 8)) console.log("    ", n, "×", e);
console.log(fails ? `\n${fails} CONTROLLI FALLITI` : "\ntutti i controlli passati"); process.exit(fails ? 1 : 0);
