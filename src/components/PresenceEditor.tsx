import { useLiveQuery } from "dexie-react-hooks";
import { db, addPresence, deletePresence } from "../db";
import { useLang } from "../i18n";
import { castHex } from "./ui";
import { computeFrenchScenes, type PresenceEvent } from "../lib/frenchscenes";
import type { Character, Presence, Scene } from "../types";

/**
 * The per-scene timeline of entrances/exits. The writer toggles each character
 * on/off in sequence; each toggle appends a presence event at the next position
 * and the french-scene divisions recompute live. A mini grid renders below.
 */
export function PresenceEditor({ scene, characters }: { scene: Scene; characters: Character[] }) {
  const { t } = useLang();
  const presence = useLiveQuery(
    async () => (await db.presence.where("sceneId").equals(scene.id!).toArray()).sort((a, b) => a.at - b.at),
    [scene.id],
  ) as Presence[] | undefined;

  if (!presence) return null;

  const events: PresenceEvent[] = presence.map((p) => ({ characterId: p.characterId, kind: p.kind, at: p.at }));
  const fscenes = computeFrenchScenes(events);

  // Current on-stage set (after all events).
  const onStage = new Set<number>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    if (e.kind === "enter") onStage.add(e.characterId);
    else onStage.delete(e.characterId);
  }

  async function toggle(characterId: number) {
    const isOn = onStage.has(characterId);
    const maxAt = presence!.reduce((m, p) => Math.max(m, p.at), 0);
    const at = presence!.length === 0 ? 0 : Math.min(1, maxAt + 0.05);
    await addPresence(scene.projectId, scene.id!, characterId, isOn ? "exit" : "enter", at);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-2">
          {t("Marquer les entrées et sorties", "Mark entrances & exits")}
        </div>
        {characters.length === 0 ? (
          <p className="text-sm text-ink-dim font-body text-base italic">
            {t("Ajoutez d'abord des personnages dans « Distribution ».", "Add characters first in “Cast”.")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {characters.map((c) => {
              const on = onStage.has(c.id!);
              const hex = castHex(c.color);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id!)}
                  className="px-3 py-1.5 rounded-full text-sm font-sans border transition-all flex items-center gap-1.5"
                  style={{
                    borderColor: hex,
                    background: on ? hex : "transparent",
                    color: on ? "#fff" : "rgb(var(--ink))",
                  }}
                  title={on ? t("En scène — cliquer pour faire sortir", "On stage — click to exit") : t("Hors scène — cliquer pour faire entrer", "Off stage — click to enter")}
                >
                  <span>{on ? "→" : "←"}</span>
                  {c.name || c.cue || "?"}
                  <span className="text-[10px] opacity-70">{on ? t("sort", "exit") : t("entre", "enter")}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Event timeline */}
      {presence.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-2">{t("Séquence", "Sequence")}</div>
          <div className="flex flex-wrap gap-1.5">
            {presence.map((p) => {
              const c = characters.find((x) => x.id === p.characterId);
              const hex = c ? castHex(c.color) : "#888";
              return (
                <span
                  key={p.id}
                  className="group inline-flex items-center gap-1 text-xs panel-3 px-2 py-1 font-sans"
                  style={{ borderColor: hex + "66" }}
                >
                  <span style={{ color: hex }}>{p.kind === "enter" ? "⤷" : "⤴"}</span>
                  <span className="text-ink">{c?.name || c?.cue || "?"}</span>
                  <span className="text-ink-faint">{p.kind === "enter" ? t("entre", "enters") : t("sort", "exits")}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-velvet-bright ml-0.5"
                    onClick={() => deletePresence(p.id!)}
                    title={t("Retirer", "Remove")}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Mini french-scene grid for THIS scene */}
      {fscenes.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-faint font-sans mb-2">
            {t(`${fscenes.length} scènes françaises`, `${fscenes.length} french-scenes`)}
          </div>
          <div className="panel-3 p-2 overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-28" />
                  {fscenes.map((fs) => (
                    <th key={fs.index} className="text-[10px] text-ink-faint tnum px-1 font-normal">{fs.index}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characters
                  .filter((c) => fscenes.some((fs) => fs.onStage.includes(c.id!)))
                  .map((c) => {
                    const hex = castHex(c.color);
                    return (
                      <tr key={c.id}>
                        <td className="text-xs text-ink pr-2 truncate max-w-[7rem] font-sans">{c.name || c.cue}</td>
                        {fscenes.map((fs) => {
                          const on = fs.onStage.includes(c.id!);
                          return (
                            <td key={fs.index} className="px-1 py-0.5 text-center">
                              <span
                                className="inline-block rounded-[4px]"
                                style={{ width: on ? 16 : 5, height: on ? 16 : 5, background: on ? hex : "rgb(var(--line) / 0.5)", opacity: on ? 1 : 0.4 }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
