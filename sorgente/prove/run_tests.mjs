// I 4 test obbligatori, giocati nel motore dell'app con i mazzi di Giova.
import { Duel, readYdk, code as C, idle, chain, pick, yes, opt, stop, peek, describe, LOC, MT, lib, name } from "./harness.mjs";
const tear = readYdk("tear.ydk"), maliss = readYdk("maliss.ydk");
const V = process.argv.includes("-v");
let pass = 0, fail = 0; const out = [];
function test(title, fn) {
  const checks = []; const ok = (cond, msg) => { checks.push([!!cond, msg]); };
  try { fn(ok); } catch (e) { checks.push([false, "ERRORE: " + e.message]); }
  const good = checks.every(([c]) => c); good ? pass++ : fail++;
  out.push(`${good ? "PASSA " : "FALLISCE"}  ${title}`); for (const [c, m] of checks) out.push(`      ${c ? "ok " : "NO "} ${m}`);
}
const has = (list, nm) => list.includes(nm);
const status = (d, p, loc) => (lib.duelQueryLocation(d.h, { flags: 1 | 2 | 0x80000, controller: p, location: loc }) || []).filter(Boolean);

// ---------- 1. Kitkallos → Tearlaments Kashtira al cimitero → rievocata, macinate e fusioni
test("1. Kitkallos manda Tearlaments Kashtira al cimitero e la rievoca (macina 2 + 5 + 3, fusioni dal cimitero)", (ok) => {
  const top = ["Polymerization", "King of the Swamp", "Tearlaments Reinoheart", "Ash Blossom & Joyous Spring", "Infinite Impermanence",
    "Tearlaments Scheiren", "Keldo the Sacred Protector", "Fairy Tail - Snow", "Mudora the Sword Oracle", "Tearlaments Havnis", "Kashtira Fenrir", "Fiendsmith Engraver",
    "Lacrima the Crimson Tears", "Shaddoll Beast", "Tearlaments Sulliek"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, verbose: V });
  let fus1 = "", mats1 = "", fus2 = "", trig = "";
  d.run([
    idle("act", "Polymerization"), pick("Kitkallos"), pick("Reinoheart"), pick("King of the Swamp"),      // King come mostro Acqua
    yes(), pick("Tearlaments Kashtira"), opt(1),                                                         // Kitkallos: manda Kashtira al cimitero
    yes(),                                                                                               // Kashtira: macina 2 (Scheiren, Keldo)
    yes(), peek((a) => { fus1 = describe(a); }), pick("Rulkallos"), peek((a) => { mats1 = describe(a); }), pick("King of the Swamp"), // Scheiren: Rulkallos con King al posto di Kitkallos
    idle("act", "Kitkallos"), pick("Kitkallos"), pick("Tearlaments Kashtira"),                           // Kitkallos bersaglia se stessa, rievoca Kashtira
    chain("Tearlaments Kashtira"), chain("Kitkallos"), opt(0),                                           // macina 5 (Kitkallos) e 3 (Kashtira, mio mazzo)
    peek((a) => { trig = describe(a); }, { chain: true }), chain("Havnis"), chain("Shaddoll Beast"),
    peek((a) => { fus2 = describe(a); }), pick("Kaleido-Heart"), pick("Reinoheart"), pick("Kitkallos"),  // Havnis: Kaleido-Heart dal cimitero
    stop(),
  ]);
  const f = d.zone(0, LOC.MZONE), g = d.zone(0, LOC.GRAVE);
  ok(fus1.includes("Rulkallos") && fus1.includes("Kaleido-Heart") && fus1.includes("Grapha"), "Scheiren macinata propone Rulkallos, Kaleido-Heart e Grapha");
  ok(mats1.includes("King of the Swamp@16") && mats1.includes("Kitkallos@4"), "per Rulkallos si può scegliere Kitkallos in campo oppure King of the Swamp nel cimitero");
  ok(trig.includes("Havnis") && trig.includes("Shaddoll Beast") && trig.includes("Sulliek"), "dopo le macinate si innescano Havnis, Shaddoll Beast e Sulliek");
  ok(has(f, "Tearlaments Kashtira"), "Tearlaments Kashtira è tornata in campo");
  ok(has(f, "Tearlaments Rulkallos") && has(f, "Tearlaments Kaleido-Heart"), "in campo anche Rulkallos e Kaleido-Heart: " + f.join(", "));
  ok(!has(f, "Tearlaments Kitkallos") && !has(g, "Tearlaments Kitkallos"), "Kitkallos è andata al cimitero e poi è tornata nel mazzo come materiale");
  ok(["Fairy Tail - Snow", "Mudora the Sword Oracle", "Kashtira Fenrir", "Fiendsmith Engraver", "Lacrima the Crimson Tears", "Shaddoll Beast", "Tearlaments Sulliek", "Keldo the Sacred Protector"].every((n) => has(g, n)), "le 10 carte macinate sono passate dal cimitero (8 ancora lì, Scheiren e Havnis usate per le fusioni)");
  ok(d.zone(0, LOC.HAND).length === 3, "Shaddoll Beast ha fatto pescare 1 carta (mano: 3)");
  ok(d.errors.length === 0, "nessun errore del motore" + (d.errors.length ? ": " + d.errors[0] : ""));
});

// ---------- 2. King of the Swamp come materiale Fusione
test("2a. King of the Swamp sostituisce un materiale con nome (Grapha) con Polimerizzazione", (ok) => {
  const top = ["Polymerization", "King of the Swamp", "Tearlaments Havnis", "Ash Blossom & Joyous Spring", "Infinite Impermanence"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, verbose: V }); let offer = "", mats = "";
  d.run([idle("act", "Polymerization"), peek((a) => { offer = describe(a); }), pick("Grapha"), peek((a) => { mats = describe(a); }), pick("King of the Swamp"), pick("Havnis"), yes(false), stop()]);
  ok(offer.includes("Grapha") && offer.includes("Kitkallos") && offer.includes("Rulkallos") && !offer.includes("Kaleido"), "proposte giuste: Grapha, Kitkallos e Rulkallos (King al posto di Kitkallos) sì; Kaleido-Heart no (servono 3 materiali)");
  ok(has(d.zone(0, LOC.MZONE), "Grapha, Dragon Overlord of Dark World"), "Grapha evocato con King (al posto di Grapha) + Havnis (OSCURITÀ)");
  ok(d.errors.length === 0, "nessun errore del motore");
});
test("2b. King of the Swamp non può sostituire quando l'altro materiale è sbagliato", (ok) => {
  const top = ["Polymerization", "King of the Swamp", "King of the Swamp", "Ash Blossom & Joyous Spring", "Infinite Impermanence"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, verbose: V }); let idleAsk = "";
  d.run([peek((a) => { idleAsk = describe(a); }), stop()]);
  ok(!/attiva\[[^\]]*Polymerization/.test(idleAsk), "con due King e nessun altro materiale Polimerizzazione non è attivabile");
  ok(!/attiva\[[^\]]*King of the Swamp/.test(idleAsk), "King non può scartarsi: l'unica Polimerizzazione è già in mano, nel mazzo non ce ne sono");
});
test("2c. King of the Swamp si scarta e aggiunge Polimerizzazione dal mazzo", (ok) => {
  const top = ["King of the Swamp", "Tearlaments Havnis", "Tearlaments Reinoheart", "Ash Blossom & Joyous Spring", "Infinite Impermanence"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, verbose: V });
  d.run([idle("act", "King of the Swamp"), pick("Polymerization"), stop()]);
  ok(has(d.zone(0, LOC.HAND), "Polymerization") && has(d.zone(0, LOC.GRAVE), "King of the Swamp"), "Polimerizzazione in mano, King al cimitero");
});

// ---------- 3. Catena con Ash Blossom e Infinite Impermanence
test("3. Catena: Scheiren (1) ← Ash Blossom avversaria (2) ← mia Infinite Impermanence dalla mano (3)", (ok) => {
  const top = ["Tearlaments Scheiren", "Tearlaments Havnis", "Infinite Impermanence", "Keldo the Sacred Protector", "Mudora the Sword Oracle"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, opp: { top: [C("Ash Blossom & Joyous Spring")], field: [C("Kashtira Fenrir")] }, verbose: V });
  const deck0 = 37; let impTargets = "";
  d.run([idle("act", "Scheiren"), chain("Ash Blossom", { p: 1 }), chain("Infinite Impermanence"), peek((a) => { impTargets = describe(a); }), pick("Kashtira Fenrir"), stop()]);
  const L = d.log.join("\n");
  ok(/ATTIVA Tearlaments Scheiren — catena 1/.test(L) && /ATTIVA Ash Blossom & Joyous Spring — catena 2 \(avv\.\)/.test(L) && /ATTIVA Infinite Impermanence — catena 3/.test(L), "la catena si costruisce 1-2-3 nell'ordine giusto");
  ok(L.indexOf("risolve anello 3") < L.indexOf("risolve anello 2") && L.indexOf("risolve anello 2") >= 0, "si risolve al contrario: 3, poi 2, poi 1");
  ok(impTargets.includes("Kashtira Fenrir") , "Imperm attivabile dalla mano (non controllo carte) e bersaglia il mostro avversario");
  const fen = status(d, 1, LOC.MZONE)[0];
  ok(fen && (fen.status & 1), "il mostro avversario ha gli effetti annullati da Imperm");
  ok(has(d.zone(0, LOC.HAND), "Tearlaments Scheiren") && d.zone(0, LOC.MZONE).length === 0, "Ash ha annullato Scheiren: resta in mano, non viene evocata");
  ok(d.count(0, LOC.DECK) === deck0, "nessuna carta macinata (mazzo ancora a " + deck0 + ")");
  ok(has(d.zone(1, LOC.GRAVE), "Ash Blossom & Joyous Spring") && has(d.zone(0, LOC.GRAVE), "Infinite Impermanence"), "Ash e Imperm finiscono nei rispettivi cimiteri");
  ok(d.errors.length === 0, "nessun errore del motore");
});
test("3b. Ash Blossom non si può attivare su ciò che non tocca il mazzo (Evocazione Normale)", (ok) => {
  const top = ["Tearlaments Scheiren", "King of the Swamp", "Infinite Impermanence", "Keldo the Sacred Protector", "Mudora the Sword Oracle"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, opp: { top: [C("Ash Blossom & Joyous Spring")] }, verbose: V }); let offered = false;
  let asked = 0; d.spy = (a) => { if (a.player === 1 && a.type === MT.SELECT_CHAIN) { asked++; if (a.selects.some((c) => name(c.code).includes("Ash"))) offered = true; } };
  d.run([idle("summon", "King of the Swamp"), stop()]);
  ok(asked > 0, "l'avversario ha avuto la possibilità di rispondere (" + asked + " finestre)");
  ok(!offered, "all'avversario non viene proposta Ash dopo una semplice Evocazione Normale");
});

// ---------- 4. Fairy Tail - Snow dal cimitero
function snowSetup(n, opp) {
  // Foolish... no: uso Scheiren per macinare Snow e riempire il cimitero in modo controllato
  const top = ["Tearlaments Scheiren", "Tearlaments Reinoheart", "Polymerization", "King of the Swamp", "Infinite Impermanence", "Fairy Tail - Snow", "Kashtira Fenrir", "Fiendsmith Engraver"].map(C);
  return new Duel({ deck: tear.main, extra: tear.extra, top, opp, verbose: V });
}
test("4a. Fairy Tail - Snow non è attivabile con solo 6 altre carte tra mano, campo e cimitero", (ok) => {
  const top = ["Tearlaments Scheiren", "Tearlaments Reinoheart", "Polymerization", "King of the Swamp", "Infinite Impermanence", "Fairy Tail - Snow", "Tearlaments Havnis", "Kashtira Fenrir"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, verbose: V }); let idleAsk = "";
  // Scheiren si evoca, manda Reinoheart, macina Snow + Havnis + Fenrir; Havnis fonde Kitkallos rimettendo nel mazzo sé stessa e King (dalla mano)
  d.run([idle("act", "Scheiren"), pick("Reinoheart"), chain("Havnis"), pick("Kitkallos"), pick("King of the Swamp"), yes(false), peek((a) => { idleAsk = describe(a); }), stop()]);
  const others = d.zone(0, LOC.GRAVE).length - 1 + d.zone(0, LOC.HAND).length + d.zone(0, LOC.MZONE).length + d.zone(0, LOC.SZONE).length;
  ok(has(d.zone(0, LOC.GRAVE), "Fairy Tail - Snow"), "Snow è nel cimitero");
  ok(others === 6, "le altre carte tra mano, campo e cimitero sono 6 (contate: " + others + ")");
  ok(idleAsk.startsWith("evoca") && !/attiva\[[^\]]*Snow/.test(idleAsk), "Snow non compare tra gli effetti attivabili");
});
test("4b. Fairy Tail - Snow si rievoca dal cimitero bandendo 7 altre carte e gira coperto un mostro avversario", (ok) => {
  const top = ["Tearlaments Scheiren", "Tearlaments Reinoheart", "Polymerization", "King of the Swamp", "Infinite Impermanence",
    "Fairy Tail - Snow", "Kashtira Fenrir", "Fiendsmith Engraver"].map(C);
  const d = new Duel({ deck: tear.main, extra: tear.extra, top, opp: { field: [C("Kashtira Fenrir")] }, verbose: V }); let choice = "";
  d.run([idle("act", "Scheiren"), pick("Reinoheart"),
    idle("act", "Fairy Tail - Snow"), peek((a) => { choice = describe(a); }),
    pick(["Reinoheart", "Kashtira Fenrir", "Fiendsmith Engraver", "Polymerization", "King of the Swamp", "Infinite Impermanence", "Scheiren"]),
    chain("Fairy Tail - Snow"), pick("Kashtira Fenrir"), stop()]);
  ok(/scegli 7-7/.test(choice), "chiede di scegliere esattamente 7 carte tra mano, campo e cimitero");
  ok(has(d.zone(0, LOC.MZONE), "Fairy Tail - Snow"), "Snow è in campo");
  ok(d.zone(0, LOC.REMOVED).length === 7, "7 carte bandite: " + d.zone(0, LOC.REMOVED).join(", "));
  const fen = (lib.duelQueryLocation(d.h, { flags: 1 | 2, controller: 1, location: LOC.MZONE }) || []).filter(Boolean)[0];
  ok(fen && fen.position === 8, "il mostro avversario è stato girato coperto in difesa");
  ok(d.errors.length === 0, "nessun errore del motore");
});

console.log(out.join("\n")); console.log(`\n${pass} test passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
