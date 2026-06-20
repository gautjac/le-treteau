import { describe, it, expect } from "vitest";
import {
  computeFrenchScenes,
  buildPresenceGrid,
  presenceWeight,
  absentCharacters,
  longestAbsence,
  sortEvents,
  type PresenceEvent,
} from "./frenchscenes";

const E = (characterId: number, kind: "enter" | "exit", at: number): PresenceEvent => ({
  characterId,
  kind,
  at,
});

describe("computeFrenchScenes", () => {
  it("returns no scenes for no events", () => {
    expect(computeFrenchScenes([])).toEqual([]);
  });

  it("a single entrance yields one french-scene with that character", () => {
    const fs = computeFrenchScenes([E(1, "enter", 0)]);
    expect(fs).toHaveLength(1);
    expect(fs[0].index).toBe(1);
    expect(fs[0].onStage).toEqual([1]);
  });

  it("classic ENTER/ENTER/EXIT/ENTER produces correct divisions", () => {
    // A enters; B enters; A exits; C enters. Then all leave.
    const fs = computeFrenchScenes([
      E(1, "enter", 0.0), // sc.1 : A
      E(2, "enter", 0.25), // sc.2 : A, B
      E(1, "exit", 0.5), // sc.3 : B
      E(3, "enter", 0.75), // sc.4 : B, C
    ]);
    expect(fs.map((s) => s.onStage)).toEqual([[1], [1, 2], [2], [2, 3]]);
    expect(fs.map((s) => s.index)).toEqual([1, 2, 3, 4]);
  });

  it("simultaneous events (same `at`) collapse into one division", () => {
    // A and B enter together → one french-scene with both.
    const fs = computeFrenchScenes([E(1, "enter", 0.1), E(2, "enter", 0.1)]);
    expect(fs).toHaveLength(1);
    expect(fs[0].onStage).toEqual([1, 2]);
    expect(fs[0].boundary).toHaveLength(2);
  });

  it("an empty stage between groups does not create a scene", () => {
    // A enters, A exits (stage empties), B enters later.
    const fs = computeFrenchScenes([
      E(1, "enter", 0.0),
      E(1, "exit", 0.4),
      E(2, "enter", 0.8),
    ]);
    // scene 1 = {A}, the empty gap is skipped, scene 2 = {B}
    expect(fs.map((s) => s.onStage)).toEqual([[1], [2]]);
    expect(fs).toHaveLength(2);
  });

  it("re-entrance after exit is handled (idempotent membership)", () => {
    const fs = computeFrenchScenes([
      E(1, "enter", 0.0),
      E(2, "enter", 0.2),
      E(1, "exit", 0.4),
      E(1, "enter", 0.6),
    ]);
    expect(fs.map((s) => s.onStage)).toEqual([[1], [1, 2], [2], [1, 2]]);
  });

  it("exit-then-enter at the SAME position: exit ordered first", () => {
    // tie-break: exits before entrances. A on stage, then at 0.5 A exits & B enters.
    const fs = computeFrenchScenes([
      E(1, "enter", 0.0),
      E(1, "exit", 0.5),
      E(2, "enter", 0.5),
    ]);
    expect(fs.map((s) => s.onStage)).toEqual([[1], [2]]);
  });

  it("ignores an exit for a character not on stage", () => {
    const fs = computeFrenchScenes([E(2, "exit", 0.0), E(1, "enter", 0.2)]);
    expect(fs.map((s) => s.onStage)).toEqual([[1]]);
  });
});

describe("sortEvents", () => {
  it("orders by position, then exit-before-enter, then id", () => {
    const sorted = sortEvents([
      E(2, "enter", 0.5),
      E(1, "exit", 0.5),
      E(3, "enter", 0.1),
    ]);
    expect(sorted.map((s) => [s.characterId, s.kind, s.at])).toEqual([
      [3, "enter", 0.1],
      [1, "exit", 0.5],
      [2, "enter", 0.5],
    ]);
  });
});

describe("buildPresenceGrid", () => {
  const events = [
    E(1, "enter", 0.0),
    E(2, "enter", 0.25),
    E(1, "exit", 0.5),
    E(3, "enter", 0.75),
  ];

  it("builds rows aligned to the supplied character order", () => {
    const grid = buildPresenceGrid([1, 2, 3], events);
    expect(grid.scenes).toHaveLength(4);
    expect(grid.cells.get(1)).toEqual([true, true, false, false]);
    expect(grid.cells.get(2)).toEqual([false, true, true, true]);
    expect(grid.cells.get(3)).toEqual([false, false, false, true]);
  });

  it("a character with no events gets an all-false row", () => {
    const grid = buildPresenceGrid([1, 2, 3, 9], events);
    expect(grid.cells.get(9)).toEqual([false, false, false, false]);
  });

  it("presenceWeight counts on-stage french-scenes", () => {
    const grid = buildPresenceGrid([1, 2, 3], events);
    expect(presenceWeight(grid, 1)).toBe(2);
    expect(presenceWeight(grid, 2)).toBe(3);
    expect(presenceWeight(grid, 3)).toBe(1);
  });

  it("absentCharacters flags those never on stage", () => {
    const grid = buildPresenceGrid([1, 2, 3, 9], events);
    expect(absentCharacters(grid)).toEqual([9]);
  });
});

describe("longestAbsence", () => {
  it("returns 0 when always present", () => {
    expect(longestAbsence([true, true, true])).toBe(0);
  });
  it("finds the longest gap", () => {
    expect(longestAbsence([true, false, false, true, false])).toBe(2);
  });
  it("handles a leading and trailing gap", () => {
    expect(longestAbsence([false, false, false, true])).toBe(3);
    expect(longestAbsence([true, false, false, false])).toBe(3);
  });
  it("empty input is 0", () => {
    expect(longestAbsence([])).toBe(0);
  });
});
