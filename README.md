# Le Tréteau

**Le studio de dramaturgie — pour bâtir une pièce de théâtre, scène par scène.**
A theatrical (stage-play) outlining & structure studio. Part of Jac's Atelier / "La shop"
family. Distinct from the screenwriting app *La Chambre* — this one is for the **theatre**.

> *les tréteaux* = the popular trestle stage.

## What it does

- **French-scene breakdown (the signature).** In French dramaturgy a new *scène*
  begins whenever a character enters or exits. Mark entrances/exits per character
  along a scene's timeline and the app auto-computes the french-scene divisions.
- **Presence grid (the hero view).** Rows = characters, columns = french-scenes,
  a filled cell = on stage. See at a glance who's present when, whose stage-time is
  thin, who vanishes for a whole act. Diagnostic tags flag thin presence / long absence.
- **Per-scene dramaturgy.** Objective / obstacle / tactic / turning-point / stakes,
  plus synopsis and the dramatic question. A board of acts → scenes with planning
  cards and structure templates (3-act, 5-act Freytag, French classical 5-act, free).
- **Cast & characters.** Bios, wants, relationships; feed the grid and the AI.
- **Script view.** Write in proper **stage-play** format (centred caps cue names,
  dialogue, italic parenthetical didascalies, act/scene headers) with live typeset.
- **La table (the table-read).** An AI panel of theatre personas — Le Dramaturge
  (structure), Le Metteur en scène (staging, *uses the presence grid*), L'Acteur
  (playability), Le Sceptique (what's not working). Modes: Notes, Punch-up, Esquisser.
  Plus a one-click **Esquisser la structure** (logline → full act/scene breakdown).
- **Export.** Print-PDF (CSS print), plain-text / Markdown script, JSON backup/import (round-trip).

Bilingual FR/EN UI from a shared `atelier:lang`. Each play has its own working
language that drives the AI output and exported script (the two-axis rule). Light
(playbill cream) and dark (velvet house) themes. Local-first — IndexedDB, no account.

## Stack

Vite + React 19 + TypeScript + Tailwind v3 + Dexie. Netlify Functions call the
Claude API (`claude-opus-4-8`), streaming NDJSON keepalive. `CLAUDE_API_KEY` env.

```
npm install
npm run dev      # netlify dev (functions + vite)
npm run build    # tsc -b && vite build
npm test         # vitest — french-scene logic, presence grid, stage-play parser
```
