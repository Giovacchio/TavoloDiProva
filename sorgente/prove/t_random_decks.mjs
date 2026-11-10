// "Qualsiasi mazzo": mazzi fatti di carte prese a caso da tutto il database, giocati a caso per un turno.
// Cerca blocchi, errori del motore e risposte che il motore rifiuta.
import { cards, scripts, lib } from "./harness.mjs";
import fs from "node:fs";
import { CardDB, Session, M, R, LOC, T, EXTRA_T, autoResponse, freePlaces } from "/home/claude/site/core.js";
const db = new CardDB(cards, JSON.parse(fs.readFileSync("/home/claude/site/strings.json", "utf8")));
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const pool = Object.keys(cards).map(Number).filter((c) => { const r = cards[c]; return !r[0] && !(r[2] & T.TOKEN) && r[2] && c < 100000000; });
const mainPool = pool.filter((c) => !(cards[c][2] & EXTRA_T)), extraPool = pool.filter((c) => cards[c][2] & EXTRA_T);
const pickN = (r, n, k) => { const idx = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx.slice(0, k); };
function randomResponse(a, r) {
  switch (a.type) {
    case M.SELECT_IDLECMD: { const all = [];
      a.summons.forEach((_, i) => all.push({ type: R.IDLECMD, action: 0, index: i })); a.special_summons.forEach((_, i) => all.push({ type: R.IDLECMD, action: 1, index: i }));
      a.activates.forEach((_, i) => { for (let k = 0; k < 4; k++) all.push({ type: R.IDLECMD, action: 5, index: i }); });
      a.spell_sets.forEach((_, i) => all.push({ type: R.IDLECMD, action: 4, index: i })); a.monster_sets.forEach((_, i) => all.push({ type: R.IDLECMD, action: 3, index: i })); a.pos_changes.forEach((_, i) => all.push({ type: R.IDLECMD, action: 2, index: i }));
      if (!all.length || r() < 0.05) return { type: R.IDLECMD, action: a.to_bp && r() < 0.5 ? 6 : a.to_ep ? 7 : 6, index: null }; return all[Math.floor(r() * all.length)]; }
    case M.SELECT_BATTLECMD: { if (a.attacks.length && r() < 0.7) return { type: R.BATTLECMD, action: 1, index: Math.floor(r() * a.attacks.length) }; if (a.chains.length && r() < 0.5) return { type: R.BATTLECMD, action: 0, index: Math.floor(r() * a.chains.length) }; return { type: R.BATTLECMD, action: a.to_ep ? 3 : 2, index: null }; }
    case M.SELECT_EFFECTYN: return { type: R.EFFECTYN, yes: r() < 0.85 };
    case M.SELECT_YESNO: return { type: R.YESNO, yes: r() < 0.7 };
    case M.SELECT_OPTION: return { type: R.OPTION, index: Math.floor(r() * a.options.length) };
    case M.SELECT_CHAIN: return { type: R.CHAIN, index: a.forced || r() < 0.85 ? Math.floor(r() * a.selects.length) : null };
    case M.SELECT_CARD: { const k = a.min + Math.floor(r() * (Math.min(a.max, a.selects.length) - a.min + 1)); return { type: R.CARD, indicies: pickN(r, a.selects.length, Math.max(k, 1)) }; }
    case M.SELECT_TRIBUTE: return { type: R.TRIBUTE, indicies: pickN(r, a.selects.length, Math.max(a.min, 1)) };
    case M.SELECT_UNSELECT_CARD: return { type: R.UNSELECT, index: a.can_finish && r() < 0.5 ? null : Math.floor(r() * a.select_cards.length) };
    case M.SELECT_PLACE: case M.SELECT_DISFIELD: { const f = freePlaces(a.field_mask, 0); return { type: a.type === M.SELECT_PLACE ? R.PLACE : R.DISFIELD, places: pickN(r, f.length, a.count).map((i) => f[i]) }; }
    case M.SELECT_POSITION: { const ps = [1, 4, 2, 8].filter((p) => a.positions & p); return { type: R.POSITION, position: ps[Math.floor(r() * ps.length)] }; }
    case M.ANNOUNCE_NUMBER: return { type: R.NUMBER, value: Math.floor(r() * a.options.length) };
    case M.ANNOUNCE_RACE: case M.ANNOUNCE_ATTRIB: { const av = BigInt(a.available), bits = []; for (let i = 0; i < 40; i++) if (av & (1n << BigInt(i))) bits.push(i); const ch = pickN(r, bits.length, a.count).map((i) => bits[i]);
      return a.type === M.ANNOUNCE_RACE ? { type: R.RACE, races: ch.map((k) => 1n << BigInt(k)) } : { type: R.ATTRIB, attributes: ch.map((k) => 2 ** k) }; }
    case M.ANNOUNCE_CARD: return { type: R.ACARD, card: mainPool[Math.floor(r() * mainPool.length)] };
    case M.SELECT_SUM: { // cerca a caso un insieme che fa il totale richiesto
      const lv = (c) => [c.amount & 0xffff, c.amount >>> 16].filter((x, i) => x > 0 || i === 0); const must = a.selects_must, n = a.selects.length;
      for (let t = 0; t < 300; t++) { const k = 1 + Math.floor(r() * Math.min(n, a.max || n)); const idx = pickN(r, n, k); const picks = [...must, ...idx.map((i) => a.selects[i])];
        let sums = [0]; for (const c of picks) { const nx = []; for (const s of sums) for (const v of lv(c)) nx.push(s + v); sums = [...new Set(nx)]; }
        if (a.select_max ? sums.some((s) => s >= a.amount) : sums.includes(a.amount)) return { type: R.SUM, indicies: [...must.keys(), ...idx.map((i) => i + must.length)] }; }
      return autoResponse(a); }
    default: return autoResponse(a);
  }
}
const N = +(process.argv[2] || 100); const seen = new Map(); let moves = 0, invalid = new Map(), stuck = [], errs = new Map(), turns = 0;
for (let g = 0; g < N; g++) {
  const r = rnd((g + (+process.argv[3] || 0)) * 104729 + 17); const main = pickN(r, mainPool.length, 40).map((i) => mainPool[i]), extra = pickN(r, extraPool.length, 15).map((i) => extraPool[i]);
  const s = new Session(lib, db, scripts, { chainAll: g % 2 === 0, autoZoneMon: g % 3 === 0 }); let ask, m = 0;
  try { ask = s.start({ main, extra, forced: [], seed: g + 1 });
    while (ask && s.turn <= 3 && m < 300) { seen.set(ask.type, (seen.get(ask.type) || 0) + 1); const resp = randomResponse(ask, r); ask = s.respond(resp); m++;
      if (s.invalid) { const k = Object.keys(M).find((x) => M[x] === s.pending?.type); if (process.env.DBG) console.log("RIFIUTATA", g, k, JSON.stringify(resp, (kk, v) => (typeof v === "bigint" ? String(v) : v)), "\n   richiesta:", JSON.stringify(s.pending, (kk, v) => (typeof v === "bigint" ? String(v) : v)).slice(0, 900), "\n   nomi:", (s.pending.attacks || s.pending.selects || []).map((c) => db.name(c.code)).join(", ")); invalid.set(k, (invalid.get(k) || 0) + 1); ask = s.respond(autoResponse(s.pending)); if (s.invalid) { stuck.push(`partita ${g}: nemmeno la risposta automatica è accettata per ${k}`); break; } } }
    if (!ask && !s.ended) stuck.push(`partita ${g}: nessuna richiesta in attesa (${s.errors.slice(-1)[0] || "?"})`);
  } catch (e) { stuck.push(`partita ${g}: eccezione ${e.message}`); }
  for (const e of s.errors) { const k = e.replace(/\d{5,}/g, (x) => db.has(x) ? `${x} (${db.name(x)})` : x).slice(0, 220); errs.set(k, (errs.get(k) || 0) + 1); }
  moves += m; turns += s.turn; s.destroy();
}
console.log(`mazzi casuali: ${N}, mosse ${moves}, turni giocati ${turns}`);
console.log("richieste:", [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${Object.keys(M).find((k) => M[k] === t) || t}×${n}`).join(", "));
console.log("risposte rifiutate (per tipo):", Object.fromEntries(invalid));
console.log("blocchi:", stuck.length, stuck.slice(0, 8));
console.log("errori del motore distinti:", errs.size); for (const [e, n] of [...errs].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log("   ", n, "×", e);
