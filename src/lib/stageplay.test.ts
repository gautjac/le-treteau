import { describe, it, expect } from "vitest";
import {
  parseStagePlay,
  looksLikeCue,
  cuesInScript,
  renderEmphasis,
  toPlainText,
} from "./stageplay";

describe("looksLikeCue", () => {
  it("accepts an all-caps name", () => {
    expect(looksLikeCue("HÉLÈNE")).toBe(true);
    expect(looksLikeCue("LE COMTE")).toBe(true);
  });
  it("accepts a cue with a parenthetical aside", () => {
    expect(looksLikeCue("HÉLÈNE (à part)")).toBe(true);
  });
  it("rejects sentence-case dialogue", () => {
    expect(looksLikeCue("Je ne peux pas rester ici.")).toBe(false);
  });
  it("rejects an overly long line", () => {
    expect(looksLikeCue("A".repeat(80))).toBe(false);
  });
  it("rejects a line with no letters", () => {
    expect(looksLikeCue("(elle sort)")).toBe(false);
    expect(looksLikeCue("123")).toBe(false);
  });
});

describe("parseStagePlay", () => {
  it("parses act and scene headings", () => {
    const els = parseStagePlay("# Acte I\n\n## Scène 1 — Le salon");
    expect(els[0]).toMatchObject({ type: "act-heading", text: "Acte I" });
    expect(els[1]).toMatchObject({ type: "scene-heading", text: "Scène 1 — Le salon" });
  });

  it("parses a cue followed by dialogue", () => {
    const els = parseStagePlay("HÉLÈNE\nJe pars demain.");
    expect(els[0]).toMatchObject({ type: "cue", text: "HÉLÈNE" });
    expect(els[1]).toMatchObject({ type: "dialogue", text: "Je pars demain." });
  });

  it("splits an inline parenthetical off the cue", () => {
    const els = parseStagePlay("HÉLÈNE (à part)\nIl ne sait rien.");
    expect(els[0]).toMatchObject({ type: "cue", text: "HÉLÈNE", cueDirection: "à part" });
  });

  it("treats a wholly-parenthetical line as a stage direction", () => {
    const els = parseStagePlay("(Elle traverse la scène.)");
    expect(els[0]).toMatchObject({ type: "direction", text: "Elle traverse la scène." });
  });

  it("treats a leading > line as centered", () => {
    const els = parseStagePlay("> Le rideau tombe.");
    expect(els[0]).toMatchObject({ type: "centered", text: "Le rideau tombe." });
  });

  it("a plain line not under a cue is a narrative direction", () => {
    const els = parseStagePlay("Un salon bourgeois. Le soir tombe.");
    expect(els[0]).toMatchObject({ type: "direction" });
  });

  it("a blank line ends the dialogue block", () => {
    const els = parseStagePlay("HÉLÈNE\nReste.\n\nUn temps.");
    expect(els.map((e) => e.type)).toEqual(["cue", "dialogue", "direction"]);
  });

  it("multi-line dialogue stays dialogue until blank", () => {
    const els = parseStagePlay("PAUL\nUn.\nDeux.\nTrois.");
    expect(els.map((e) => e.type)).toEqual(["cue", "dialogue", "dialogue", "dialogue"]);
  });
});

describe("cuesInScript", () => {
  it("collects distinct cue names uppercased", () => {
    const script = "HÉLÈNE\nBonjour.\n\nPAUL\nSalut.\n\nhélène\nencore"; // last line lowercase = not a cue
    expect(cuesInScript(script).sort()).toEqual(["HÉLÈNE", "PAUL"]);
  });
});

describe("renderEmphasis", () => {
  it("returns plain text as one segment", () => {
    expect(renderEmphasis("hello")).toEqual([{ text: "hello", bold: false, italic: false }]);
  });
  it("parses italics and bold", () => {
    const segs = renderEmphasis("a *b* c **d**");
    expect(segs.find((s) => s.text === "b")?.italic).toBe(true);
    expect(segs.find((s) => s.text === "d")?.bold).toBe(true);
  });
});

describe("toPlainText", () => {
  const script = "# Acte I\n\n## Scène 1\n\n(Un salon.)\n\nHÉLÈNE (à part)\nIl ment.\n\n> Rideau.";

  it("renders a readable plain-text layout", () => {
    const txt = toPlainText(script);
    expect(txt).toContain("ACTE I");
    expect(txt).toContain("HÉLÈNE (À PART)");
    expect(txt).toContain("    Il ment.");
    expect(txt).toContain("(Un salon.)");
  });

  it("renders markdown when asked", () => {
    const md = toPlainText(script, { markdown: true });
    expect(md).toContain("# ACTE I");
    expect(md).toContain("## Scène 1");
    expect(md).toContain("**HÉLÈNE (À PART)**");
    expect(md).toContain("*(Un salon.)*");
  });
});
