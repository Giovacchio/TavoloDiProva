// Tavolo di Prova — logica di gioco senza interfaccia.
// La usano sia la pagina (index.html) sia i test automatici, così ciò che viene provato è ciò che gira.
// Il motore delle regole è ocgcore (EDOPro) compilato in WebAssembly: qui c'è solo il "tavolo" attorno.

export const LOC = { DECK: 1, HAND: 2, MZONE: 4, SZONE: 8, GRAVE: 16, REMOVED: 32, EXTRA: 64, OVERLAY: 128 };
export const LOC_NAME = { 1: "mazzo", 2: "mano", 4: "campo", 8: "magie/trappole", 16: "cimitero", 32: "banditi", 64: "Extra Deck", 128: "materiale" };
export const T = { MONSTER: 1, SPELL: 2, TRAP: 4, NORMAL: 0x10, EFFECT: 0x20, FUSION: 0x40, RITUAL: 0x80, SPIRIT: 0x200, UNION: 0x400, GEMINI: 0x800, TUNER: 0x1000, SYNCHRO: 0x2000, TOKEN: 0x4000,
  QUICKPLAY: 0x10000, CONTINUOUS: 0x20000, EQUIP: 0x40000, FIELD: 0x80000, COUNTER: 0x100000, FLIP: 0x200000, TOON: 0x400000, XYZ: 0x800000, PENDULUM: 0x1000000, LINK: 0x4000000 };
export const EXTRA_T = T.FUSION | T.SYNCHRO | T.XYZ | T.LINK;
export const M = { RETRY: 1, HINT: 2, WIN: 5, SELECT_BATTLECMD: 10, SELECT_IDLECMD: 11, SELECT_EFFECTYN: 12, SELECT_YESNO: 13, SELECT_OPTION: 14, SELECT_CARD: 15,
  SELECT_CHAIN: 16, SELECT_PLACE: 18, SELECT_POSITION: 19, SELECT_TRIBUTE: 20, SORT_CHAIN: 21, SELECT_COUNTER: 22, SELECT_SUM: 23, SELECT_DISFIELD: 24,
  SORT_CARD: 25, SELECT_UNSELECT_CARD: 26, CONFIRM_DECKTOP: 30, CONFIRM_CARDS: 31, SHUFFLE_DECK: 32, NEW_TURN: 40, NEW_PHASE: 41, MOVE: 50, POS_CHANGE: 53, SET: 54,
  SUMMONING: 60, SPSUMMONING: 62, FLIPSUMMONING: 64, CHAINING: 70, CHAIN_SOLVING: 72, CHAIN_END: 74, CHAIN_NEGATED: 75, CHAIN_DISABLED: 76,
  DRAW: 90, DAMAGE: 91, RECOVER: 92, PAY_LPCOST: 100, ATTACK: 110, RPS: 132, ANNOUNCE_RACE: 140, ANNOUNCE_ATTRIB: 141, ANNOUNCE_CARD: 142, ANNOUNCE_NUMBER: 143 };
export const ASK = new Set([10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 132, 140, 141, 142, 143]);
export const R = { BATTLECMD: 0, IDLECMD: 1, EFFECTYN: 2, YESNO: 3, OPTION: 4, CARD: 5, UNSELECT: 7, CHAIN: 8, DISFIELD: 9, PLACE: 10, POSITION: 11, TRIBUTE: 12, COUNTER: 13, SUM: 14, SORT: 15,
  RACE: 16, ATTRIB: 17, ACARD: 18, NUMBER: 19, RPS: 20 };
export const POS = { FU_ATK: 1, FD_ATK: 2, FU_DEF: 4, FD_DEF: 8, FACEDOWN: 10, DEFENSE: 12 };
export const DUMMY = 46986414; // carta segnaposto del mazzo avversario
// codice, posizione, livello, rango, ATK, DEF, materiali, segnalini, stato, frecce Link
export const Q_FLAGS = 1 | 2 | 16 | 32 | 256 | 512 | 65536 | 131072 | 524288 | 8388608;
const MODE_MR5 = 190464n;

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));


// Messaggi di sistema del motore tradotti (il file strings.json resta in inglese come riserva per quelli non elencati).
export const IT_STRINGS = {
  1: "Evocazione Normale", 2: "Evocazione Speciale", 3: "Evocazione per Scoperta", 7: "Attiva", 10: "Rimuovi i Segnalini", 11: "Paga LP", 12: "Stacca i Materiali",
  30: "C'è stato un replay: continui l'attacco?", 31: "Attaccare direttamente?", 32: "Condurre un'altra Battle Phase?", 60: "Testa", 61: "Croce", 62: "Effetto di testa", 63: "Effetto di croce", 65: "Usa l'effetto", 66: "Tieni rivelata",
  70: "Carte Mostro", 71: "Carte Magia", 72: "Carte Trappola", 90: "Evocare Normalmente senza Tributi?", 91: "Usare la tua Evocazione Normale aggiuntiva?", 92: "Usare un mostro dell'avversario?", 93: "Continuare a scegliere materiali?",
  94: "Attivare ora l'effetto di questa carta?", 95: "Usare l'effetto di \"%ls\"?", 96: "Usare l'effetto di \"%ls\" per evitare la distruzione?", 97: "Mettere \"%ls\" nella Zona Magie e Trappole?", 98: "Applicare un effetto che sostituisce il costo?",
  100: "Vai per primo", 101: "Vai per secondo", 102: "Il tuo", 103: "Quello dell'avversario",
  200: "Usare l'effetto di \"%ls\" da [%ls]?", 202: "Controllare il campo?", 203: "Attivare una carta o un effetto?", 205: "Scegli l'ordine [dall'alto verso il basso]", 206: "Scegli l'ordine degli anelli della catena", 210: "Continuare a scegliere carte?",
  218: "Pagare LP con l'effetto di \"%ls\", invece?", 219: "Staccare Materiali Xyz con l'effetto di \"%ls\", invece?", 220: "Rimuovere Segnalini con l'effetto di \"%ls\", invece?", 221: "Attivare l'Effetto ad Innesco di \"%ls\" da [%ls]?", 222: "Attivare un Effetto ad Innesco?",
  500: "Scegli le carte da offrire come Tributo", 501: "Scegli le carte da scartare", 502: "Scegli le carte da distruggere", 503: "Scegli le carte da bandire", 504: "Scegli le carte da mandare al Cimitero", 505: "Scegli le carte da far tornare in mano",
  506: "Scegli le carte da aggiungere alla mano", 507: "Scegli le carte da rimettere nel Deck", 508: "Scegli la carta da Evocare Normalmente", 509: "Scegli le carte da Evocare Specialmente", 510: "Scegli le carte da Posizionare",
  511: "Scegli i Materiali da Fusione", 512: "Scegli i Materiali Synchro", 513: "Scegli i Materiali Xyz", 514: "Scegli carte scoperte", 515: "Scegli carte coperte", 516: "Scegli mostri in Posizione di Attacco", 517: "Scegli mostri in Posizione di Difesa",
  518: "Scegli la carta da equipaggiare", 519: "Scegli i Materiali Xyz da staccare", 520: "Scegli i mostri di cui cambiare il controllo", 521: "Scegli le carte da sostituire", 522: "Scegli mostri scoperti in Posizione di Attacco",
  523: "Scegli mostri scoperti in Posizione di Difesa", 524: "Scegli mostri coperti in Posizione di Attacco", 525: "Scegli mostri coperti in Posizione di Difesa", 526: "Scegli le carte da rivelare", 527: "Scegli le carte da mettere sul Terreno",
  528: "Scegli il mostro di cui cambiare la posizione", 529: "Scegli una tua carta", 530: "Scegli una carta dell'avversario", 531: "Scegli i mostri per l'Evocazione tramite Tributo", 532: "Scegli i mostri da cui staccare Materiali Xyz",
  533: "Scegli i Materiali Link", 534: "Scegli le carte da tenere sul Terreno", 549: "Scegli il bersaglio dell'attacco", 550: "Scegli l'effetto che vuoi attivare", 551: "Scegli i bersagli dell'effetto", 552: "Scegli testa o croce", 553: "Scegli il risultato del dado",
  554: "Dichiara 1 tipo di carta", 555: "Scegli un'opzione", 556: "Scegli l'effetto da applicare", 560: "Scegli", 561: "Scegli la posizione", 562: "Dichiara un Attributo", 563: "Dichiara un Tipo", 564: "Dichiara il nome di una carta", 565: "Dichiara un numero",
  566: "Scegli l'effetto da attivare", 567: "Dichiara un Livello o Rango", 568: "Scegli la carta da risolvere", 569: "Scegli la zona in cui mettere \"%ls\"", 570: "Scegli le zone che diventano inutilizzabili", 571: "Scegli la zona in cui spostare la carta",
  572: "Scegli le carte su cui mettere un Segnalino", 573: "Aggiungi alla mano", 574: "Manda al Cimitero", 575: "Scegli le carte di cui annullare gli effetti", 576: "Scegli le carte di cui cambiare ATK/DEF", 577: "Scegli le carte a cui applicare l'effetto",
  578: "Scegli le carte da attaccare come materiale", 579: "Scegli le carte da far tornare al Cimitero",
  1000: "Deck", 1001: "Mano", 1002: "Zona Mostri", 1003: "Zona Magie e Trappole", 1004: "Cimitero", 1005: "Bandite", 1006: "Extra Deck", 1007: "Materiale Xyz", 1008: "Zona Terreno", 1009: "Zona Pendulum",
};

// ---------------------------------------------------------------- dati delle carte
// Ogni carta: [alias, [setcode], tipo, livello, attributo, razza, atk, def, scalaSx, scalaDx, frecce, nome, testo, [stringhe effetto]]
export class CardDB {
  constructor(raw, sys) { this.raw = raw; this.sys = { ...(sys || {}), ...IT_STRINGS }; this._idx = null; }
  c(code) { return this.raw[code] || null; }
  has(code) { return !!this.raw[code]; }
  name(code) { const c = this.raw[code]; return c ? c[11] : `#${code}`; }
  text(code) { const c = this.raw[code]; return c ? c[12] : ""; }
  type(code) { const c = this.raw[code]; return c ? c[2] : 0; }
  isExtra(code) { return (this.type(code) & EXTRA_T) !== 0; }
  data(code) { const c = this.raw[code]; if (!c) return null;
    return { code: Number(code), alias: c[0], setcodes: c[1], type: c[2], level: c[3], attribute: c[4], race: BigInt(c[5]), attack: c[6], defense: c[7], lscale: c[8], rscale: c[9], link_marker: c[10] }; }
  // testo di un effetto: i 20 bit bassi sono l'indice, il resto il codice carta (0 = stringa di sistema)
  desc(d) { d = BigInt(d ?? 0); const code = Number(d >> 20n), i = Number(d & 0xfffffn); const c = this.raw[code];
    if (c && i < 16 && c[13] && c[13][i]) return c[13][i]; if (code === 0) return this.sys[Number(d)] || ""; return ""; }
  index() { if (!this._idx) { this._idx = []; for (const k in this.raw) { const c = this.raw[k]; if (c[2] & T.TOKEN) continue; if (!c[0] || Math.abs(c[0] - Number(k)) > 20) this._idx.push([Number(k), c[11], norm(c[11])]); } } return this._idx; }
  search(q, n = 40) { q = norm(q); if (q.length < 2) return []; const out = [];
    for (const r of this.index()) if (r[2].includes(q)) { out.push(r); if (out.length > 400) break; }
    out.sort((a, b) => (b[2].startsWith(q) - a[2].startsWith(q)) || a[1].length - b[1].length); return out.slice(0, n); }
  find(name) { const l = norm(name); for (const r of this.index()) if (r[2] === l) return r[0]; return null; }
}
const norm = (s) => String(s).toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

const RACES = ["Guerriero", "Incantatore", "Fata", "Demone", "Zombie", "Macchina", "Acqua", "Pyro", "Roccia", "Bestia Alata", "Pianta", "Insetto", "Tuono", "Drago", "Bestia", "Guerriero-Bestia", "Dinosauro", "Pesce", "Serpente Marino", "Rettile", "Psichico", "Bestia Divina", "Dio Creatore", "Wyrm", "Cyberse", "Illusione"];
const ATTRS = ["TERRA", "ACQUA", "FUOCO", "VENTO", "LUCE", "OSCURITÀ", "DIVINO"];
export const RACE_NAMES = RACES, ATTR_NAMES = ATTRS;
const bitName = (v, names) => { for (let i = 0; i < names.length; i++) if (Number(v) === 2 ** i) return names[i]; return ""; };
// riga descrittiva: "OSCURITÀ · Acqua / Fusione / Effetto"
export function typeLine(db, code) {
  const c = db.c(code); if (!c) return ""; const t = c[2];
  if (t & T.SPELL) return "Magia" + (t & T.QUICKPLAY ? " Rapida" : t & T.CONTINUOUS ? " Continua" : t & T.EQUIP ? " Equipaggiamento" : t & T.FIELD ? " Terreno" : t & T.RITUAL ? " Rituale" : " Normale");
  if (t & T.TRAP) return "Trappola" + (t & T.CONTINUOUS ? " Continua" : t & T.COUNTER ? " Contro" : " Normale");
  const kinds = [];
  for (const [b, n] of [[T.FUSION, "Fusione"], [T.SYNCHRO, "Synchro"], [T.XYZ, "Xyz"], [T.LINK, "Link"], [T.RITUAL, "Rituale"], [T.PENDULUM, "Pendulum"], [T.TUNER, "Tuner"], [T.FLIP, "Scoperta"], [T.SPIRIT, "Spirit"], [T.UNION, "Unione"], [T.GEMINI, "Gemello"], [T.TOON, "Toon"], [T.TOKEN, "Segna-Mostro"]]) if (t & b) kinds.push(n);
  kinds.push(t & T.EFFECT ? "Effetto" : "Normale");
  return `${bitName(c[4], ATTRS)} · ${[bitName(c[5], RACES), ...kinds].filter(Boolean).join(" / ")}`;
}
export function statLine(db, code, q) {
  const c = db.c(code); if (!c) return ""; const t = c[2];
  if (!(t & T.MONSTER)) return "";
  const atk = q && q.attack != null ? q.attack : c[6]; const A = atk < 0 ? "?" : atk;
  if (t & T.LINK) return `LINK-${c[3]} · ATK ${A}`;
  const def = q && q.defense != null ? q.defense : c[7];
  return `${t & T.XYZ ? "Rango" : "Livello"} ${q && (q.rank || q.level) ? (t & T.XYZ ? q.rank : q.level) : c[3]} · ATK ${A} / DEF ${def < 0 ? "?" : def}`;
}
export function frame(db, code) {
  const t = db.type(code);
  if (t & T.TOKEN) return "token"; if (t & T.LINK) return "link"; if (t & T.XYZ) return "xyz"; if (t & T.SYNCHRO) return "synchro";
  if (t & T.FUSION) return "fusion"; if (t & T.SPELL) return "spell"; if (t & T.TRAP) return "trap"; if (t & T.RITUAL) return "ritual";
  if (t & T.EFFECT) return "effect"; return "normal";
}

// ---------------------------------------------------------------- mazzi
// Accetta un file .ydk oppure una lista "3 Nome Carta" / "Nome Carta x3", una per riga.
export function parseDeckText(db, text) {
  const main = [], extra = [], side = [], miss = [];
  const lines = String(text).split(/\r?\n/);
  if (lines.some((l) => /^\s*#(main|extra)/i.test(l)) || lines.filter((l) => /^\s*\d{4,10}\s*$/.test(l)).length >= 5) {
    let sec = "m";
    for (const l of lines) { const t = l.trim(); if (/^#main/i.test(t)) sec = "m"; else if (/^#extra/i.test(t)) sec = "e"; else if (t.startsWith("!")) sec = "s";
      else if (/^\d+$/.test(t)) { const c = Number(t); if (!db.has(c)) { if (sec !== "s") miss.push(t); continue; }
        if (sec === "s") side.push(c); else if (db.isExtra(c)) extra.push(c); else main.push(c); } }
    return { main, extra, side, miss };
  }
  let sec = "m";
  for (const l of lines) { let t = l.trim(); if (!t) continue;
    if (/^(side|side deck)\b[: ]*(\(\d+\))?$/i.test(t)) { sec = "s"; continue; }
    if (/^(main|main deck|mazzo|mazzo principale|extra|extra deck|monsters?|spells?|traps?|mostri|magie|trappole)\b[: ]*(\(\d+\))?$/i.test(t)) { sec = "m"; continue; }
    let n = 1; const m = t.match(/^(\d+)\s*[x×]?\s+(.+)$/i) || t.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
    if (m) { if (/^\d+$/.test(m[1])) { n = +m[1]; t = m[2]; } else { t = m[1]; n = +m[2]; } }
    const c = db.find(t); if (!c) { if (sec !== "s") miss.push(t); continue; }
    if (sec === "s") continue;
    for (let i = 0; i < Math.min(n, 3); i++) (db.isExtra(c) ? extra : main).push(c); }
  return { main, extra, side, miss };
}
export function toYdk(deck) { return ["#created by Tavolo di Prova", "#main", ...deck.main, "#extra", ...deck.extra, "!side", ""].join("\n"); }
// controlli di buon senso: avvisi, non divieti (un mazzo strano si può comunque provare)
export function deckWarnings(db, deck) {
  const w = [];
  if (deck.main.length < 40) w.push(`Mazzo principale di ${deck.main.length} carte: il minimo è 40.`);
  if (deck.main.length > 60) w.push(`Mazzo principale di ${deck.main.length} carte: il massimo è 60.`);
  if (deck.extra.length > 15) w.push(`Extra Deck di ${deck.extra.length} carte: il massimo è 15.`);
  const cnt = new Map(); for (const c of [...deck.main, ...deck.extra]) { const k = db.c(c)?.[0] || c; cnt.set(k, (cnt.get(k) || 0) + 1); }
  for (const [k, n] of cnt) if (n > 3) w.push(`${db.name(k)}: ${n} copie (il massimo è 3).`);
  return w;
}

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- risposte automatiche
export function freePlaces(mask, player = 0) {
  const out = [];
  for (const [p, sh] of [[player, 0], [1 - player, 16]]) { const m = (mask >>> sh) & 0xffff;
    for (let i = 0; i < 7; i++) if (!(m & (1 << i))) out.push({ player: p, location: LOC.MZONE, sequence: i });
    for (let i = 0; i < 8; i++) if (!(m & (1 << (8 + i)))) out.push({ player: p, location: LOC.SZONE, sequence: i }); }
  return out;
}
// risposta "neutra" a qualsiasi richiesta: la usa l'avversario fantoccio (passa sempre) e i casi che l'app decide da sola
export function autoResponse(m) {
  switch (m.type) {
    case M.SELECT_IDLECMD: return { type: R.IDLECMD, action: m.to_ep ? 7 : 6, index: null };
    case M.SELECT_BATTLECMD: return m.to_ep || m.to_m2 || !m.attacks.length ? { type: R.BATTLECMD, action: m.to_ep ? 3 : 2, index: null } : { type: R.BATTLECMD, action: 1, index: 0 };
    case M.SELECT_CHAIN: return { type: R.CHAIN, index: m.forced ? 0 : null };
    case M.SELECT_EFFECTYN: return { type: R.EFFECTYN, yes: false };
    case M.SELECT_YESNO: return { type: R.YESNO, yes: false };
    case M.SELECT_OPTION: return { type: R.OPTION, index: 0 };
    case M.SELECT_CARD: return { type: R.CARD, indicies: [...Array(Math.max(1, m.min)).keys()] };
    case M.SELECT_TRIBUTE: return { type: R.TRIBUTE, indicies: [...Array(Math.max(1, m.min)).keys()] };
    case M.SELECT_UNSELECT_CARD: return { type: R.UNSELECT, index: m.can_finish ? null : 0 };
    case M.SELECT_PLACE: return { type: R.PLACE, places: freePlaces(m.field_mask, m.player).slice(0, m.count) };
    case M.SELECT_DISFIELD: return { type: R.DISFIELD, places: freePlaces(m.field_mask, m.player).slice(0, m.count) };
    case M.SELECT_POSITION: for (const p of [1, 4, 2, 8]) if (m.positions & p) return { type: R.POSITION, position: p }; return { type: R.POSITION, position: 1 };
    case M.SELECT_SUM: return { type: R.SUM, indicies: [...m.selects_must.keys(), m.selects_must.length] };
    case M.SELECT_COUNTER: return { type: R.COUNTER, counters: m.cards.map((_, i) => (i === 0 ? m.count : 0)) };
    case M.SORT_CARD: case M.SORT_CHAIN: return { type: R.SORT, order: null };
    case M.RPS: return { type: R.RPS, value: 1 };
    case M.ANNOUNCE_NUMBER: return { type: R.NUMBER, value: 0 };
    case M.ANNOUNCE_RACE: return { type: R.RACE, races: [] };
    case M.ANNOUNCE_ATTRIB: return { type: R.ATTRIB, attributes: [] };
    case M.ANNOUNCE_CARD: return { type: R.ACARD, card: DUMMY };
  }
  return null;
}

// ---------------------------------------------------------------- una partita di prova
// Una Session è un duello contro un avversario che non fa nulla. Tutte le risposte del giocatore
// vengono registrate: "annulla" ricrea il duello con lo stesso seme e rigioca le risposte tranne l'ultima.
export class Session {
  constructor(lib, db, scripts, opts = {}) {
    this.lib = lib; this.db = db; this.scripts = scripts; this.h = null;
    this.opts = { chainAll: false, autoZoneMon: false, autoZoneST: true, autoSingle: false, autoAtk: false, ...opts };
  }
  // setup: { main, extra, forced: [codici da avere in mano], seed, stack?: [ordine fisso del mazzo, solo test] }
  start(setup) { this.setup = setup; this.responses = []; this._create(); return this.run(); }
  _create() {
    const { main, extra, forced = [], seed, stack = null } = this.setup, db = this.db, scripts = this.scripts, lib = this.lib;
    if (this.h) { try { lib.destroyDuel(this.h); } catch (e) {} this.h = null; }
    this.log = []; this.pending = null; this.ended = false; this.turn = 0; this.turnPlayer = 0; this.phase = 0; this.errors = []; this.hint = ""; this.retry = false; this.chain = 0; this._grp = null;
    this.stats = { ns: 0, sp: 0, act: 0 };
    const rest = main.slice(), hand = [];
    for (const c of forced) { const i = rest.indexOf(c); if (i >= 0 && hand.length < 5) { rest.splice(i, 1); hand.push(c); } }
    // il motore non mescola da solo all'inizio (in EDOPro lo fa il programma): mescolo qui con il seme della partita.
    // Le mescolate durante il duello (dopo una ricerca, ecc.) le fa invece il motore, sempre a partire dal seme.
    const rnd = rng(seed); for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const s = BigInt((seed >>> 0) || 1);
    const h = lib.createDuel({ flags: MODE_MR5 | (stack ? 16n : 0n), seed: [s, s * 6364136223846793005n & 0xffffffffffffffffn, 1442695040888963407n, s ^ 0x9e3779b97f4a7c15n],
      team1: { startingLP: 8000, startingDrawCount: stack ? 5 : 5 - hand.length, drawCountPerTurn: 1 }, team2: { startingLP: 8000, startingDrawCount: 5, drawCountPerTurn: 1 },
      cardReader: (code) => db.data(code) || { code, alias: 0, setcodes: [], type: 0, level: 0, attribute: 0, race: 0n, attack: 0, defense: 0, lscale: 0, rscale: 0, link_marker: 0 },
      scriptReader: (name) => { const b = name.split("/").pop(); return scripts[b] ?? null; },
      errorHandler: (t, text) => { this.errors.push(String(text)); } });
    if (!h) throw new Error("impossibile creare il duello");
    this.h = h;
    for (const b of ["constant.lua", "utility.lua"]) lib.loadScript(h, b, scripts[b]);
    const add = (team, code, location) => lib.duelNewCard(h, { team, duelist: 0, code, controller: team, location, sequence: 0, position: POS.FD_DEF });
    if (stack) { for (let i = stack.length - 1; i >= 0; i--) add(0, stack[i], LOC.DECK); }
    else { for (const c of rest) add(0, c, LOC.DECK); for (const c of hand) add(0, c, LOC.HAND); }
    for (const c of extra) add(0, c, LOC.EXTRA);
    for (let i = 0; i < 40; i++) add(1, DUMMY, LOC.DECK);
    lib.startDuel(h);
  }
  _say(html, kind = "") { this.log.push({ html, kind }); this._grp = null; }
  // raggruppa spostamenti uguali consecutivi: "Dal mazzo al cimitero: A, B, C"
  _move(label, code) {
    const n = `<b>${esc(this.db.name(code))}</b>`;
    if (this._grp && this._grp.label === label) { this._grp.entry.html += ", " + n; return; }
    const entry = { html: `${label}: ${n}`, kind: "move" }; this.log.push(entry); this._grp = { label, entry };
  }
  _note(m) {
    const db = this.db, n = (c) => `<b>${esc(db.name(c))}</b>`, opp = (p) => (p === 0 ? "" : "Avversario: ");
    switch (m.type) {
      case M.NEW_TURN: this.turn++; this.turnPlayer = m.player; this._say(`Turno ${this.turn} · ${m.player === 0 ? "tuo" : "avversario"}`, "turn"); break;
      case M.NEW_PHASE: this.phase = m.phase; break;
      case M.HINT: if (m.hint_type === 3 && m.player === 0) this.hint = db.desc(m.hint); break;
      case M.RETRY: this.retry = true; break;
      case M.WIN: this.ended = true; this._say(m.player === 0 ? "Hai vinto il duello" : "Duello perso", "turn"); break;
      case M.MOVE: {
        const f = m.from || {}, t = m.to || {}; const fl = f.location & 0x7f, tl = t.location & 0x7f; if (!m.card) break;
        const who = (t.controller ?? f.controller) === 1 ? "Avversario · " : "";
        if (tl === LOC.GRAVE) this._move(`${who}${fl === LOC.DECK ? "Dal mazzo al cimitero" : fl === LOC.HAND ? "Dalla mano al cimitero" : fl === LOC.EXTRA ? "Dall'Extra al cimitero" : "Al cimitero"}`, m.card);
        else if (tl === LOC.REMOVED) this._move(`${who}Bandita${t.position & POS.FACEDOWN ? " coperta" : ""}`, m.card);
        else if (tl === LOC.HAND && fl !== LOC.DECK) this._move(`${who}Torna in mano`, m.card);
        else if (tl === LOC.HAND && this.turn > 0) this._move(`${who}Aggiunta alla mano`, m.card);
        else if (tl === LOC.DECK && fl !== LOC.DECK) this._move(`${who}Torna nel mazzo`, m.card);
        else if (tl === LOC.EXTRA && fl !== LOC.EXTRA) this._move(`${who}Torna nell'Extra Deck`, m.card);
        else if ((t.location & LOC.OVERLAY) && !(f.location & LOC.OVERLAY)) this._move(`${who}Diventa materiale Xyz`, m.card);
        break; }
      case M.SUMMONING: this.stats.ns += m.controller === 0; this._say(`${opp(m.controller)}Evocazione Normale: ${n(m.code)}`, "sum"); break;
      case M.SPSUMMONING: this.stats.sp += m.controller === 0; this._say(`${opp(m.controller)}Evocazione Speciale: ${n(m.code)}`, "sum"); break;
      case M.FLIPSUMMONING: this._say(`${opp(m.controller)}Evocazione per Scoperta: ${n(m.code)}`, "sum"); break;
      case M.SET: this._say(`${opp(m.controller)}Posizionata coperta${m.code ? ": " + n(m.code) : ""}`, "set"); break;
      case M.CHAINING: { this.stats.act += m.controller === 0; this.chain = m.chain_size; const d = db.desc(m.description);
        this._say(`${opp(m.controller)}Attivi ${n(m.code)}${m.chain_size > 1 ? ` <i>anello ${m.chain_size}</i>` : ""}${d ? `<span class="d"> — ${esc(d)}</span>` : ""}`, "act"); break; }
      case M.CHAIN_NEGATED: case M.CHAIN_DISABLED: this._say(`Anello ${m.chain_size} annullato`, "neg"); break;
      case M.CHAIN_END: this.chain = 0; break;
      case M.SHUFFLE_DECK: if (m.player === 0 && this.turn > 0) this._say("Mazzo mescolato", "info"); break;
      case M.CONFIRM_DECKTOP: if (m.player === 0 && m.cards?.length) this._say(`Carte rivelate dalla cima del mazzo: ${m.cards.map((c) => n(c.code)).join(", ")}`, "info"); break;
      case M.DRAW: if (m.player === 0 && this.turn > 0) this._say(`Peschi: ${m.drawn.map((d) => n(d.code)).join(", ")}`, "draw"); break;
      case M.PAY_LPCOST: this._say(`${opp(m.player)}Paghi ${m.amount} LP`, "info"); break;
      case M.DAMAGE: this._say(`${m.player === 0 ? "Subisci" : "L'avversario subisce"} ${m.amount} danni`, "info"); break;
      case M.RECOVER: this._say(`${m.player === 0 ? "Recuperi" : "L'avversario recupera"} ${m.amount} LP`, "info"); break;
      case M.ATTACK: this._say(`${opp(m.attacker?.controller ?? 0)}Attacco dichiarato`, "info"); break;
    }
  }
  // decide se una richiesta va gestita senza disturbare il giocatore; ritorna la risposta o null
  _auto(ask) {
    const o = this.opts;
    switch (ask.type) {
      case M.SORT_CHAIN: case M.SORT_CARD: case M.SELECT_COUNTER: case M.RPS: return autoResponse(ask);
      case M.SELECT_POSITION: return o.autoAtk && (ask.positions & POS.FU_ATK) ? { type: R.POSITION, position: POS.FU_ATK } : null;
      // scelte obbligate: una sola risposta possibile, quindi niente da decidere
      case M.SELECT_CARD: return o.autoSingle && ask.selects.length === 1 && ask.min === 1 && !ask.can_cancel ? { type: R.CARD, indicies: [0] } : null;
      case M.SELECT_TRIBUTE: return o.autoSingle && ask.selects.length === 1 && ask.min === 1 && !ask.can_cancel ? { type: R.TRIBUTE, indicies: [0] } : null;
      case M.SELECT_UNSELECT_CARD: return o.autoSingle && ask.select_cards.length === 1 && !ask.unselect_cards.length && !ask.can_finish && !ask.can_cancel ? { type: R.UNSELECT, index: 0 } : null;
      case M.SELECT_OPTION: return o.autoSingle && ask.options.length === 1 ? { type: R.OPTION, index: 0 } : null;
      case M.SELECT_CHAIN:
        if (ask.forced) return null;
        if (!ask.selects.length) return { type: R.CHAIN, index: null };
        // come EDOPro: senza "chiedi sempre" le finestre senza effetti a innesco si passano da sole
        // spe_count 127 = effetti a innesco: si chiede sempre. Il resto sono finestre per effetti rapidi:
        // di base si passano da sole (gli effetti rapidi restano attivabili dal menu della carta a catena vuota).
        if (ask.spe_count === 127) return null;
        if (ask.spe_count === 0 || !o.chainAll) return { type: R.CHAIN, index: null };
        return null;
      case M.SELECT_PLACE: case M.SELECT_DISFIELD: {
        const free = freePlaces(ask.field_mask, 0); if (free.length <= ask.count) return { type: ask.type === M.SELECT_PLACE ? R.PLACE : R.DISFIELD, places: free.slice(0, ask.count) };
        if (ask.type === M.SELECT_DISFIELD || ask.count !== 1 || free.some((p) => p.player !== 0)) return null;
        const st = free.every((p) => p.location === LOC.SZONE);
        if (st && o.autoZoneST) return { type: R.PLACE, places: [free[0]] };
        if (!st && o.autoZoneMon) { const main = free.filter((p) => p.location === LOC.MZONE && p.sequence < 5); return { type: R.PLACE, places: [main[0] || free[0]] }; }
        return null; }
    }
    return null;
  }
  run(replay = null) {
    const lib = this.lib, h = this.h;
    for (let guard = 0; guard < 50000; guard++) {
      const st = lib.duelProcess(h); const msgs = lib.duelGetMessage(h); let ask = null;
      for (const m of msgs) { this._note(m); if (ASK.has(m.type)) ask = m; }
      if (st === 0) { this.ended = true; this.pending = null; return null; }
      if (st === 2) continue;
      if (!ask) { if (this.retry && this.pending) return this.pending; this.errors.push("il motore è in attesa senza una richiesta"); this.pending = null; return null; }
      if (ask.player === 1) { lib.duelSetResponse(h, autoResponse(ask)); continue; }
      if (replay && replay.length) { lib.duelSetResponse(h, replay.shift().r); continue; }
      const auto = this._auto(ask);
      if (auto) { this.responses.push({ r: auto, auto: true }); lib.duelSetResponse(h, auto); continue; }
      this.pending = ask; return ask;
    }
    this.errors.push("troppi passi senza una richiesta: possibile ciclo"); this.pending = null; return null;
  }
  // risposta del giocatore. Se il motore la rifiuta resta in attesa della stessa richiesta: invalid = true.
  respond(resp) {
    const prev = this.pending, n = this.responses.length, hint = this.hint; this.retry = false; this.invalid = false; this.hint = "";
    this.responses.push({ r: resp, auto: false }); this.lib.duelSetResponse(this.h, resp);
    const ask = this.run();
    if (this.retry) { this.retry = false; this.invalid = true; this.responses.length = n; this.pending = prev; this.hint = hint; return prev; }
    return ask;
  }
  _replay(keep) { this._create(); this.responses = keep.slice(); return this.run(keep.slice()); }
  get moves() { return this.responses.filter((x) => !x.auto).length; }
  undo() {
    const keep = this.responses.slice(); while (keep.length && keep[keep.length - 1].auto) keep.pop();
    if (!keep.length) return this.pending; keep.pop();
    return this._replay(keep);
  }
  restart() { this.responses = []; this._create(); return this.run(); }
  destroy() { if (this.h) { try { this.lib.destroyDuel(this.h); } catch (e) {} this.h = null; } }
  zone(p, l) { try { return this.lib.duelQueryLocation(this.h, { flags: Q_FLAGS, controller: p, location: l }) || []; } catch (e) { return []; } }
  count(p, l) { try { return this.lib.duelQueryCount(this.h, p, l); } catch (e) { return 0; } }
  lp() { try { return this.lib.duelQueryField(this.h).players.map((p) => p.lp); } catch (e) { return [8000, 8000]; } }
}

// azioni possibili per una carta in una certa posizione, data la richiesta in corso
export function actionsFor(db, ask, loc, seq, code, controller = 0) {
  const out = []; if (!ask) return out;
  const same = (c) => c.location === loc && c.sequence === seq && c.controller === controller && (code == null || c.code === code);
  const act = (c) => { const d = db.desc(c.description); return d ? "Attiva: " + d : "Attiva effetto"; };
  if (ask.type === M.SELECT_IDLECMD) {
    ask.summons.forEach((c, i) => same(c) && out.push({ label: "Evocazione Normale", kind: "summon", r: { type: R.IDLECMD, action: 0, index: i } }));
    ask.special_summons.forEach((c, i) => same(c) && out.push({ label: "Evocazione Speciale", kind: "sp", r: { type: R.IDLECMD, action: 1, index: i } }));
    ask.activates.forEach((c, i) => same(c) && out.push({ label: act(c), kind: "act", r: { type: R.IDLECMD, action: 5, index: i } }));
    ask.monster_sets.forEach((c, i) => same(c) && out.push({ label: "Posiziona coperto", kind: "set", r: { type: R.IDLECMD, action: 3, index: i } }));
    ask.spell_sets.forEach((c, i) => same(c) && out.push({ label: "Posiziona coperta", kind: "set", r: { type: R.IDLECMD, action: 4, index: i } }));
    ask.pos_changes.forEach((c, i) => same(c) && out.push({ label: "Cambia posizione", kind: "pos", r: { type: R.IDLECMD, action: 2, index: i } }));
  } else if (ask.type === M.SELECT_BATTLECMD) {
    ask.chains.forEach((c, i) => same(c) && out.push({ label: act(c), kind: "act", r: { type: R.BATTLECMD, action: 0, index: i } }));
    ask.attacks.forEach((c, i) => same(c) && out.push({ label: c.can_direct ? "Attacca (anche diretto)" : "Attacca", kind: "atk", r: { type: R.BATTLECMD, action: 1, index: i } }));
  } else if (ask.type === M.SELECT_CHAIN) {
    ask.selects.forEach((c, i) => same(c) && out.push({ label: act(c), kind: "act", r: { type: R.CHAIN, index: i } }));
  }
  return out;
}
