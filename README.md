# Tavolo di Prova

Un sito per provare da soli i mazzi di Yu-Gi-Oh!, con le regole vere: si carica un file `.ydk`, si pesca la mano, si gioca il turno e si ricomincia con un tocco. Funziona da PC e da telefono, non c'è niente da installare.

Le regole non sono riscritte: il sito usa lo stesso nucleo di EDOPro (ygopro-core di Project Ignis) fatto girare nel browser, con il codice ufficiale di ogni carta. L'avversario non gioca: ha un mazzo segnaposto e passa sempre.

## Cosa c'è in questa cartella

| File | A cosa serve |
|---|---|
| `index.html` | La pagina: interfaccia e logica del tavolo |
| `engine/` | Il motore delle regole (ocgcore-wasm 0.1.6) |
| `cards.gz.b64.txt` | Dati di tutte le carte (da BabelCDB) |
| `scripts.gz.b64.txt` | Regole di ogni carta (da CardScripts) |
| `strings.json` | Messaggi di sistema del motore |
| `seed.json` | I due mazzi di esempio |
| `data-version.json` | Data e versione dei dati |
| `manifest.webmanifest`, `icon-*.png` | Per aggiungere il sito alla schermata Home del telefono |
| `sorgente/` | Il codice da cui la pagina è costruita e le prove automatiche |

Le immagini delle carte non sono in questa cartella: le scarica il browser di chi usa il sito, una volta per carta.

## Aggiornare le carte

Quando escono carte nuove, `sorgente/build_data.py` rigenera `cards.gz.b64.txt` e `scripts.gz.b64.txt` dalle versioni aggiornate di BabelCDB e CardScripts, e `sorgente/make_page.py` ricostruisce la pagina. Le prove in `sorgente/prove/` vanno rilanciate dopo ogni aggiornamento.

## Licenze

- Il codice di questo sito è distribuito con licenza **GNU Affero General Public License 3.0 o successiva** (file `LICENSE`), la stessa del motore e del codice delle carte.
- [ygopro-core](https://github.com/edo9300/ygopro-core) e [CardScripts](https://github.com/ProjectIgnis/CardScripts): © Project Ignis e collaboratori, AGPL-3.0-or-later.
- [ocgcore-wasm](https://github.com/n1xx1/ocgcore-wasm): la parte JavaScript è MIT (`engine/LICENSE.txt`); contiene ygopro-core, che è AGPL.
- [BabelCDB](https://github.com/ProjectIgnis/BabelCDB): database delle carte di Project Ignis.

Yu-Gi-Oh! è un marchio di Konami. Nomi, testi e immagini delle carte appartengono a Konami. Questo è un progetto amatoriale e gratuito, senza alcun legame con Konami, fatto per esercitarsi con i propri mazzi.
