/**
 * French-scene breakdown — the signature of Le Tréteau.
 *
 * In classical French dramaturgy a new "scène" begins each time a character
 * ENTERS or EXITS. From a stream of entrance/exit events along a scene's
 * timeline we derive:
 *   • the ordered list of french-scenes (the divisions between events), and
 *   • which characters are on stage during each division.
 *
 * From there we build the presence GRID: rows = characters, columns =
 * french-scenes, a filled cell = that character is on stage in that division.
 *
 * This module is pure and fully unit-tested. It is deliberately tolerant of
 * messy input (an exit for someone not on stage is ignored; a re-entrance is
 * idempotent) so the UI never has to police the data.
 */

export type PresenceKind = "enter" | "exit";

export interface PresenceEvent {
  characterId: number;
  kind: PresenceKind;
  at: number; // ordering key within the scene (0..1, but any number works)
}

export interface FrenchScene {
  /** 1-based index within the parent scene. */
  index: number;
  /** characters on stage during this division, in stable id order. */
  onStage: number[];
  /** the event(s) that opened this division (entrances/exits at the boundary). */
  boundary: PresenceEvent[];
}

/** Sort events by position, then by kind (exits before entrances at a tie so a
 *  character who exits-and-re-enters at the same beat is handled sanely), then
 *  by character id for determinism. */
export function sortEvents(events: PresenceEvent[]): PresenceEvent[] {
  return [...events].sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    if (a.kind !== b.kind) return a.kind === "exit" ? -1 : 1;
    return a.characterId - b.characterId;
  });
}

/**
 * Compute the french-scene divisions for one scene from its presence events.
 *
 * Each *group of simultaneous events* (same `at`) closes the previous division
 * and opens a new one. The on-stage set is carried forward and mutated by each
 * event. A leading group of pure entrances simply populates the first division.
 */
export function computeFrenchScenes(events: PresenceEvent[]): FrenchScene[] {
  if (events.length === 0) return [];
  const sorted = sortEvents(events);

  // Group events that share the same position.
  const groups: PresenceEvent[][] = [];
  for (const ev of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[0].at === ev.at) last.push(ev);
    else groups.push([ev]);
  }

  const onStage = new Set<number>();
  const scenes: FrenchScene[] = [];

  for (const group of groups) {
    for (const ev of group) {
      if (ev.kind === "enter") onStage.add(ev.characterId);
      else onStage.delete(ev.characterId);
    }
    // A division with nobody on stage (everyone just left) is not a scene —
    // it's the gap before the next entrance. Skip empties.
    if (onStage.size === 0) continue;
    scenes.push({
      index: scenes.length + 1,
      onStage: [...onStage].sort((a, b) => a - b),
      boundary: group,
    });
  }

  return scenes;
}

export interface PresenceGrid {
  /** character ids, row order (as supplied). */
  characterOrder: number[];
  /** the computed french-scenes (columns). */
  scenes: FrenchScene[];
  /** grid[characterId] -> boolean[] aligned to `scenes`. */
  cells: Map<number, boolean[]>;
}

/**
 * Build the presence grid for ONE dramatic scene.
 * @param characterIds row order (so the grid is stable & matches the cast list)
 * @param events the scene's presence events
 */
export function buildPresenceGrid(
  characterIds: number[],
  events: PresenceEvent[],
): PresenceGrid {
  const scenes = computeFrenchScenes(events);
  const cells = new Map<number, boolean[]>();
  for (const cid of characterIds) {
    cells.set(
      cid,
      scenes.map((fs) => fs.onStage.includes(cid)),
    );
  }
  return { characterOrder: characterIds, scenes, cells };
}

/** Count of french-scenes a character appears in (their "presence weight"). */
export function presenceWeight(grid: PresenceGrid, characterId: number): number {
  return (grid.cells.get(characterId) ?? []).filter(Boolean).length;
}

/** The set of characters who never appear in any french-scene of this dramatic scene. */
export function absentCharacters(grid: PresenceGrid): number[] {
  return grid.characterOrder.filter((cid) => presenceWeight(grid, cid) === 0);
}

/**
 * A cross-scene "longueurs" detector used by the dramaturg: for each character,
 * the longest run of consecutive PROJECT-LEVEL columns in which they are absent.
 * `columns` is a flat ordered list of presence-bitmaps per character.
 */
export function longestAbsence(presentByColumn: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const present of presentByColumn) {
    if (present) {
      run = 0;
    } else {
      run += 1;
      if (run > best) best = run;
    }
  }
  return best;
}
