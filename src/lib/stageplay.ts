/**
 * A focused parser/formatter for STAGE-PLAY script markup — deliberately NOT
 * screenplay Fountain. Theatre layout differs: character cue names are centred
 * and in caps above their speech (or inline, depending on house style; we use
 * centred-cue), stage directions sit in italics inside parentheses, and act /
 * scene headers anchor the structure.
 *
 * Markup (lean, hand-written by the playwright):
 *   ## ACT / TABLEAU header     → "# Acte I" or "## Scène 2 — Le salon"
 *   CHARACTER CUE               → a line of ALL CAPS (optionally "NAME, aside")
 *                                 followed by the line(s) of dialogue beneath it
 *   (stage direction)           → a line wholly in (parentheses) → didascalie
 *   > centred direction         → a line beginning with ">" (e.g. a curtain note)
 *   plain line after a cue      → dialogue
 *   plain line elsewhere        → narrative stage direction (didascalie)
 *
 * Inline: *italics*, **bold**. Parenthetical asides inside dialogue stay inline
 * and are rendered italic by the renderer.
 */

export type StageElementType =
  | "act-heading"
  | "scene-heading"
  | "cue"
  | "dialogue"
  | "direction" // didascalie (its own paragraph)
  | "centered";

export interface StageElement {
  type: StageElementType;
  text: string;
  /** inline parenthetical attached to a cue, e.g. "HÉLÈNE (à part)". */
  cueDirection?: string;
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

/** A cue is a short line in ALL CAPS (letters), optionally with a (parenthetical). */
export function looksLikeCue(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  // strip a trailing parenthetical "(à part)" before testing caps
  const core = t.replace(/\([^)]*\)\s*$/, "").trim();
  if (!core) return false;
  // must contain at least one letter, and have no lowercase letters
  const letters = core.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  if (letters.length === 0) return false;
  return core === core.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(core);
}

function splitCue(line: string): { name: string; direction?: string } {
  const t = line.trim();
  const m = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m && m[1].trim()) return { name: m[1].trim(), direction: m[2].trim() };
  return { name: t.replace(/[.:]\s*$/, "").trim() };
}

/** Parse raw stage-play markup into ordered elements. */
export function parseStagePlay(raw: string): StageElement[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const out: StageElement[] = [];
  let inDialogue = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isBlank(line)) {
      inDialogue = false;
      continue;
    }

    // Act heading: "# ..."
    if (/^#\s+/.test(trimmed) && !/^##/.test(trimmed)) {
      out.push({ type: "act-heading", text: trimmed.replace(/^#\s+/, "") });
      inDialogue = false;
      continue;
    }
    // Scene heading: "## ..."
    if (/^##\s+/.test(trimmed)) {
      out.push({ type: "scene-heading", text: trimmed.replace(/^##\s+/, "") });
      inDialogue = false;
      continue;
    }
    // Centered direction: "> ..."
    if (/^>\s?/.test(trimmed)) {
      out.push({ type: "centered", text: trimmed.replace(/^>\s?/, "") });
      inDialogue = false;
      continue;
    }
    // Stand-alone stage direction: a line wholly in parentheses.
    if (/^\(.*\)$/.test(trimmed)) {
      out.push({ type: "direction", text: trimmed.replace(/^\(/, "").replace(/\)$/, "") });
      continue;
    }
    // Character cue.
    if (looksLikeCue(trimmed)) {
      const { name, direction } = splitCue(trimmed);
      out.push({ type: "cue", text: name, cueDirection: direction });
      inDialogue = true;
      continue;
    }
    // Otherwise: dialogue if we're under a cue, else a narrative direction.
    if (inDialogue) {
      out.push({ type: "dialogue", text: trimmed });
    } else {
      out.push({ type: "direction", text: trimmed });
    }
  }

  return out;
}

/** List of distinct cue names that appear in a script (uppercased, deduped). */
export function cuesInScript(raw: string): string[] {
  const seen = new Set<string>();
  for (const el of parseStagePlay(raw)) {
    if (el.type === "cue") seen.add(el.text.toUpperCase());
  }
  return [...seen];
}

/** Inline emphasis → segments (the renderer turns these into spans). */
export interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export function renderEmphasis(text: string): Segment[] {
  const segs: Segment[] = [];
  const re = /(\*\*|\*)/g;
  let bold = false;
  let italic = false;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (t: string) => {
    if (t) segs.push({ text: t, bold, italic });
  };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[1] === "**") bold = !bold;
    else italic = !italic;
    last = m.index + m[1].length;
  }
  push(text.slice(last));
  return segs.length ? segs : [{ text }];
}

/**
 * Render a script to PLAIN TEXT in a conventional theatre layout (used by the
 * .txt / .md export). Cues are centred-ish via uppercase + indentation,
 * directions wrapped in parentheses & italic-marked for markdown.
 */
export function toPlainText(raw: string, opts: { markdown?: boolean } = {}): string {
  const md = opts.markdown ?? false;
  const lines: string[] = [];
  for (const el of parseStagePlay(raw)) {
    switch (el.type) {
      case "act-heading":
        lines.push("", md ? `# ${el.text.toUpperCase()}` : el.text.toUpperCase(), "");
        break;
      case "scene-heading":
        lines.push("", md ? `## ${el.text}` : el.text, "");
        break;
      case "cue": {
        const cue = el.cueDirection ? `${el.text} (${el.cueDirection})` : el.text;
        lines.push(md ? `**${cue.toUpperCase()}**` : cue.toUpperCase());
        break;
      }
      case "dialogue":
        lines.push(`    ${el.text}`);
        break;
      case "direction":
        lines.push(md ? `*(${el.text})*` : `(${el.text})`);
        break;
      case "centered":
        lines.push(md ? `*${el.text}*` : `        ${el.text}`);
        break;
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
