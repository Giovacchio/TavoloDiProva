// Banco di prova: stesso motore e stessi dati dell'app, guidato da script.
import fs from "node:fs"; import zlib from "node:zlib"; import path from "node:path";
const SITE = process.env.SITE || "/home/claude/site";
const gun = (f) => JSON.parse(zlib.gunzipSync(Buffer.from(fs.readFileSync(path.join(SITE, f), "utf8").trim(), "base64")).toString("utf8"));
export const cards = gun("cards.gz.b64.txt"), scripts = gun("scripts.gz.b64.txt");
export const mod = await import(path.join(SITE, "engine/index.js"));
export const lib = await mod.default({ sync: true });
export const MT = mod.OcgMessageType, RT = mod.OcgResponseType;
export const LOC = { DECK: 1, HAND: 2, MZONE: 4, SZONE: 8, GRAVE: 16, REMOVED: 32, EXTRA: 64, OVERLAY: 128 };
export const name = (c) => (cards[c] ? cards[c][11] : `#${c}`);
export const code = (nm) => { const l = nm.toLowerCase(); for (const k in cards) if (cards[k][11].toLowerCase() === l && !cards[k][0]) return +k; throw new Error("carta sconosciuta: " + nm); };
export const cardData = (c) => { const r = cards[c]; if (!r) return null; return { code: +c, alias: r[0], setcodes: r[1], type: r[2], level: r[3], attribute: r[4], race: BigInt(r[5]), attack: r[6], defense: r[7], lscale: r[8], rscale: r[9], link_marker: r[10] }; };
export function readYdk(file) { let sec = "", main = [], extra = []; for (const l of fs.readFileSync(file, "utf8").split(/\r?\n/)) { const t = l.trim(); if (t.startsWith("#main")) sec = "m"; else if (t.startsWith("#extra")) sec = "e"; else if (t.startsWith("!")) sec = "s"; else if (/^\d+$/.test(t)) { if (sec === "m") main.push(+t); else if (sec === "e") extra.push(+t); } } return { main, extra }; }
const ASK = new Set([10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 132, 140, 141, 142, 143]);
const tname = (t) => Object.entries(MT).find(([, v]) => v === t)?.[0] ?? String(t);
export const J = (o) => JSON.stringify(o, (k, v) => (typeof v === "bigint" ? v.toString() : v));
const DUMMY = 46986414;

export class Duel {
  // top: carte in cima al mazzo nell'ordine dato (le prime 5 sono la mano), il resto del mazzo sotto
  constructor({ deck, extra = [], top = [], opp = {}, verbose = false }) {
    this.errors = []; this.log = []; this.verbose = verbose; this.missing = [];
    const rest = deck.slice(); for (const c of top) { const i = rest.indexOf(c); if (i < 0) throw new Error("non nel mazzo: " + name(c)); rest.splice(i, 1); }
    const order = top.concat(rest);
    const h = (this.h = lib.createDuel({ flags: 190464n | 16n, seed: [1n, 7n, 13n, 29n],
      team1: { startingLP: 8000, startingDrawCount: 5, drawCountPerTurn: 1 }, team2: { startingLP: 8000, startingDrawCount: 5, drawCountPerTurn: 1 },
      cardReader: (c) => cardData(c), scriptReader: (n) => { const b = n.split("/").pop(); const s = scripts[b]; if (s == null) this.missing.push(b); return s ?? null; },
      errorHandler: (t, x) => this.errors.push(String(x)) }));
    for (const b of ["constant.lua", "utility.lua"]) lib.loadScript(h, b, scripts[b]);
    const add = (team, c, loc, seq = 0, pos = 2) => lib.duelNewCard(h, { team, duelist: 0, code: c, controller: team, location: loc, sequence: seq, position: pos });
    for (let i = order.length - 1; i >= 0; i--) add(0, order[i], LOC.DECK);
    for (const c of extra) add(0, c, LOC.EXTRA);
    const od = (opp.top || []).concat(Array(40).fill(DUMMY)); for (let i = od.length - 1; i >= 0; i--) add(1, od[i], LOC.DECK);
    (opp.field || []).forEach((c, i) => add(1, c, LOC.MZONE, i, 1));
    lib.startDuel(h); this.turn = 0;
  }
  zone(p, l) { return (lib.duelQueryLocation(this.h, { flags: 1 | 2, controller: p, location: l }) || []).filter(Boolean).map((c) => name(c.code)); }
  count(p, l) { return lib.duelQueryCount(this.h, p, l); }
  say(s) { this.log.push(s); if (this.verbose) console.log(s); }
  note(m) {
    const L = { 1: "mazzo", 2: "mano", 4: "campo", 8: "M/T", 16: "cimitero", 32: "banditi", 64: "extra", 128: "materiale" };
    if (m.type === MT.MOVE) this.say(`   · ${name(m.card)}: ${L[m.from?.location] ?? m.from?.location} → ${L[m.to?.location] ?? m.to?.location}${m.to?.controller === 1 ? " (avv.)" : ""}`);
    else if (m.type === MT.SPSUMMONING) this.say(`   · EVOCAZIONE SPECIALE ${name(m.code)}`);
    else if (m.type === MT.SUMMONING) this.say(`   · EVOCAZIONE NORMALE ${name(m.code)}`);
    else if (m.type === MT.CHAINING) this.say(`   · ATTIVA ${name(m.code)} — catena ${m.chain_size}${m.controller === 1 ? " (avv.)" : ""}`);
    else if (m.type === MT.CHAIN_SOLVING) this.say(`   · risolve anello ${m.chain_size}`);
    else if (m.type === MT.CHAIN_NEGATED || m.type === MT.CHAIN_DISABLED) this.say(`   · anello ${m.chain_size} NEGATO`);
    else if (m.type === MT.NEW_TURN) { this.turn++; this.say(`— turno ${this.turn} (giocatore ${m.player}) —`); }
    else if (m.type === MT.RETRY) { this.say("   !! RETRY (risposta rifiutata)"); this.retry = true; }
  }
  // steps: funzioni (ask, duel) => risposta | undefined (non è per me)
  run(steps) {
    let i = 0;
    for (let g = 0; g < 20000; g++) {
      const st = lib.duelProcess(this.h); let ask = null;
      for (const m of lib.duelGetMessage(this.h)) { this.note(m); if (ASK.has(m.type)) ask = m; }
      if (this.retry) throw new Error("risposta rifiutata dal motore");
      if (st === 0) return "fine";
      if (st === 2) continue;
      if (!ask) throw new Error("attesa senza richiesta");
      let r;
      if (this.spy) this.spy(ask);
      const step = steps[i];
      if (ask.type === MT.SELECT_PLACE || ask.type === MT.SELECT_DISFIELD) r = { type: ask.type === MT.SELECT_PLACE ? RT.SELECT_PLACE : RT.SELECT_DISFIELD, places: free(ask) };
      else if (ask.type === MT.SELECT_POSITION && !(step && step.kind === "pos")) r = { type: RT.SELECT_POSITION, position: ask.positions & 1 ? 1 : ask.positions & 4 ? 4 : 8 };
      else if (ask.type === MT.SORT_CARD || ask.type === MT.SORT_CHAIN) r = { type: RT.SORT_CARD, order: null };
      else if (step && step.p === ask.player) {
        if (this.onAsk) this.onAsk(ask);
        let st2 = step;
        while (st2 && st2.kind === "peek" && st2.p === ask.player && (ask.type !== MT.SELECT_CHAIN || (st2.chain && ask.selects.length))) { st2.fn(ask, this); st2 = steps[++i]; }
        r = st2 && st2.p === ask.player && st2.kind !== "peek" ? st2.fn(ask, this) : undefined;
        if (r === STOP) return "stop";
        if (r && r.__keep) r = r.r; else if (r) i++;
      }
      if (!r) {
        if (ask.type === MT.SELECT_CHAIN && !ask.forced) r = { type: RT.SELECT_CHAIN, index: null };
        else if (ask.player === 1 && ask.type === MT.SELECT_IDLECMD) r = { type: RT.SELECT_IDLECMD, action: 7, index: null };
        else if (ask.player === 1 && ask.type === MT.SELECT_BATTLECMD) r = { type: RT.SELECT_BATTLECMD, action: 3, index: null };
        else if (ask.player === 1 && ask.type === MT.SELECT_EFFECTYN) r = { type: RT.SELECT_EFFECTYN, yes: false };
        else if (ask.player === 1 && ask.type === MT.SELECT_YESNO) r = { type: RT.SELECT_YESNO, yes: false };
        else if (i >= steps.length) { this.pending = ask; return "copione finito"; }
        else throw new Error(`passo ${i} (${step?.label}) non corrisponde alla richiesta ${tname(ask.type)} del giocatore ${ask.player}: ${describe(ask)}`);
      }
      lib.duelSetResponse(this.h, r);
    }
    throw new Error("troppi passi");
  }
}
export const STOP = Symbol("stop");
function free(ask) { const out = []; const mask = ask.field_mask;
  for (const [p, sh] of [[ask.player, 0], [1 - ask.player, 16]]) { const m = (mask >>> sh) & 0xffff;
    for (let s = 0; s < 7; s++) if (!(m & (1 << s))) out.push({ player: p, location: LOC.MZONE, sequence: s });
    for (let s = 0; s < 8; s++) if (!(m & (1 << (8 + s)))) out.push({ player: p, location: LOC.SZONE, sequence: s }); }
  return out.slice(0, ask.count); }
export function describe(a) {
  const f = (l) => (l || []).map((c) => `${name(c.code)}@${c.location}${c.controller ? "(avv)" : ""}`).join(" | ");
  switch (a.type) {
    case MT.SELECT_IDLECMD: return `evoca[${f(a.summons)}] speciale[${f(a.special_summons)}] attiva[${f(a.activates)}] posa[${f(a.spell_sets)}]`;
    case MT.SELECT_CHAIN: return `catena forced=${a.forced} [${f(a.selects)}]`;
    case MT.SELECT_CARD: case MT.SELECT_TRIBUTE: return `scegli ${a.min}-${a.max} tra [${f(a.selects)}]`;
    case MT.SELECT_UNSELECT_CARD: return `scegli (${a.min}-${a.max}, fine=${a.can_finish}) tra [${f(a.select_cards)}] già scelte [${f(a.unselect_cards)}]`;
    default: return J(a).slice(0, 500);
  }
}
const has = (c, nm) => name(c.code).toLowerCase().includes(nm.toLowerCase());
const mk = (p, label, fn, kind) => ({ p, label, fn, kind });
// --- passi
export const idle = (action, nm, { p = 0, nth = 0, loc } = {}) => mk(p, `idle ${action} ${nm ?? ""}`, (a) => {
  if (a.type !== MT.SELECT_IDLECMD) return;
  const A = { summon: [0, "summons"], sp: [1, "special_summons"], mset: [3, "monster_sets"], sset: [4, "spell_sets"], act: [5, "activates"] }[action];
  if (action === "end") return { type: RT.SELECT_IDLECMD, action: 7, index: null };
  const idx = a[A[1]].map((c, i) => [c, i]).filter(([c]) => has(c, nm) && (!loc || c.location === loc)).map(([, i]) => i);
  if (idx.length <= nth) throw new Error(`"${nm}" non disponibile per ${action}: ${describe(a)}`);
  return { type: RT.SELECT_IDLECMD, action: A[0], index: idx[nth] };
});
// catena: attiva nm appena compare tra le possibilità; finché non compare passa
export const chain = (nm, { p = 0 } = {}) => mk(p, `catena ${nm}`, (a) => {
  if (a.type === MT.SELECT_EFFECTYN && has(a, nm)) return { type: RT.SELECT_EFFECTYN, yes: true };
  if (a.type !== MT.SELECT_CHAIN) return;
  const i = a.selects.findIndex((c) => has(c, nm)); if (i < 0) return a.forced ? undefined : { __keep: true, r: { type: RT.SELECT_CHAIN, index: null } };
  return { type: RT.SELECT_CHAIN, index: i };
});
export const pick = (names, { p = 0 } = {}) => mk(p, `scegli ${names}`, (a) => {
  names = [].concat(names);
  if (a.type === MT.SELECT_CARD || a.type === MT.SELECT_TRIBUTE) { const used = new Set(); const ind = names.map((nm) => { const i = a.selects.findIndex((c, k) => !used.has(k) && has(c, nm)); if (i < 0) throw new Error(`"${nm}" non selezionabile: ${describe(a)}`); used.add(i); return i; });
    return { type: a.type === MT.SELECT_CARD ? RT.SELECT_CARD : RT.SELECT_TRIBUTE, indicies: ind }; }
  if (a.type === MT.SELECT_UNSELECT_CARD) { const i = a.select_cards.findIndex((c) => has(c, names[0])); if (i < 0) throw new Error(`"${names[0]}" non selezionabile: ${describe(a)}`); return { type: RT.SELECT_UNSELECT_CARD, index: i }; }
});
export const finish = ({ p = 0 } = {}) => mk(p, "fine selezione", (a) => (a.type === MT.SELECT_UNSELECT_CARD && a.can_finish ? { type: RT.SELECT_UNSELECT_CARD, index: null } : undefined));
export const yes = (v = true, { p = 0 } = {}) => mk(p, `sì/no ${v}`, (a) => (a.type === MT.SELECT_EFFECTYN ? { type: RT.SELECT_EFFECTYN, yes: v } : a.type === MT.SELECT_YESNO ? { type: RT.SELECT_YESNO, yes: v } : undefined));
export const opt = (i, { p = 0 } = {}) => mk(p, `opzione ${i}`, (a) => (a.type === MT.SELECT_OPTION ? { type: RT.SELECT_OPTION, index: i } : undefined));
export const stop = (p = 0) => mk(p, "stop", (a) => (a.type === MT.SELECT_IDLECMD ? STOP : undefined));
export const peek = (fn, { p = 0, chain = false } = {}) => ({ ...mk(p, "osserva", fn, "peek"), chain });
