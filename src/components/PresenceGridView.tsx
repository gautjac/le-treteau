import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useLang } from "../i18n";
import { castHex, Empty } from "./ui";
import {
  buildPresenceGrid, longestAbsence, type PresenceEvent,
} from "../lib/frenchscenes";
import type { Act, Character, Presence, Project, Scene } from "../types";

interface Column {
  sceneId: number;
  sceneTitle: string;
  actTitle: string;
  /** french-scene index within the scene (1-based) */
  fsIndex: number;
  onStage: number[];
}

/**
 * The project-wide presence grid (the hero). Rows = characters; columns =
 * french-scenes across every dramatic scene, in act→scene order. A filled cell
 * = the character is on stage in that french-scene.
 */
export function PresenceGridView({
  project,
  onOpenScene,
}: {
  project: Project;
  onOpenScene: (sceneId: number) => void;
}) {
  const { t } = useLang();
  const acts = useLiveQuery(
    async () => (await db.acts.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Act[] | undefined;
  const scenes = useLiveQuery(
    async () => await db.scenes.where("projectId").equals(project.id!).toArray(),
    [project.id],
  ) as Scene[] | undefined;
  const characters = useLiveQuery(
    async () => (await db.characters.where("projectId").equals(project.id!).toArray()).sort((a, b) => a.order - b.order),
    [project.id],
  ) as Character[] | undefined;
  const presence = useLiveQuery(
    async () => await db.presence.where("projectId").equals(project.id!).toArray(),
    [project.id],
  ) as Presence[] | undefined;

  const { columns, cellOf, weights, gaps } = useMemo(() => {
    const columns: Column[] = [];
    const cellOf = new Map<string, boolean>(); // `${charId}:${colIdx}`
    if (!acts || !scenes || !characters || !presence) {
      return { columns, cellOf, weights: new Map<number, number>(), gaps: new Map<number, number>() };
    }
    const charIds = characters.map((c) => c.id!);
    const byScene = new Map<number, PresenceEvent[]>();
    for (const p of presence) {
      const arr = byScene.get(p.sceneId) ?? [];
      arr.push({ characterId: p.characterId, kind: p.kind, at: p.at });
      byScene.set(p.sceneId, arr);
    }

    for (const act of acts) {
      const actScenes = scenes.filter((s) => s.actId === act.id).sort((a, b) => a.order - b.order);
      for (const sc of actScenes) {
        const grid = buildPresenceGrid(charIds, byScene.get(sc.id!) ?? []);
        grid.scenes.forEach((fs) => {
          const colIdx = columns.length;
          columns.push({
            sceneId: sc.id!,
            sceneTitle: sc.title || t("Scène", "Scene"),
            actTitle: act.title,
            fsIndex: fs.index,
            onStage: fs.onStage,
          });
          for (const cid of charIds) {
            cellOf.set(`${cid}:${colIdx}`, fs.onStage.includes(cid));
          }
        });
      }
    }

    const weights = new Map<number, number>();
    const gaps = new Map<number, number>();
    for (const cid of charIds) {
      const row = columns.map((_, i) => cellOf.get(`${cid}:${i}`) ?? false);
      weights.set(cid, row.filter(Boolean).length);
      gaps.set(cid, longestAbsence(row));
    }
    return { columns, cellOf, weights, gaps };
  }, [acts, scenes, characters, presence, t]);

  if (!acts || !scenes || !characters || !presence) return null;

  if (characters.length === 0) {
    return (
      <Empty
        icon="▦"
        title={t("La grille attend votre distribution", "The grid awaits your cast")}
        hint={t("Ajoutez des personnages, puis marquez leurs entrées et sorties dans une scène.", "Add characters, then mark their entrances and exits inside a scene.")}
      />
    );
  }
  if (columns.length === 0) {
    return (
      <Empty
        icon="▦"
        title={t("Aucune présence marquée", "No presence marked yet")}
        hint={t(
          "Ouvrez une scène et marquez les entrées/sorties des personnages — chaque mouvement crée une scène française, une colonne ici.",
          "Open a scene and mark character entrances/exits — each move creates a french-scene, a column here.",
        )}
      />
    );
  }

  // Column groupings by dramatic scene (for the header bands)
  const groups: { sceneId: number; title: string; act: string; span: number; start: number }[] = [];
  columns.forEach((c, i) => {
    const last = groups[groups.length - 1];
    if (last && last.sceneId === c.sceneId) last.span++;
    else groups.push({ sceneId: c.sceneId, title: c.sceneTitle, act: c.actTitle, span: 1, start: i });
  });

  const CELL = 30;
  const NAMECOL = 168;

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-2xl sm:text-3xl text-ink">{t("Grille de présence", "Presence grid")}</h2>
        <p className="text-ink-dim text-sm font-body text-base">
          {t(
            "Lignes = personnages · colonnes = scènes françaises (une nouvelle à chaque entrée ou sortie). Une case pleine = en scène.",
            "Rows = characters · columns = french-scenes (a new one on every entrance or exit). A filled cell = on stage.",
          )}
        </p>
      </div>

      <div className="panel p-3 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Act / scene header bands */}
          <div className="flex" style={{ marginLeft: NAMECOL }}>
            {groups.map((g, gi) => (
              <button
                key={gi}
                onClick={() => onOpenScene(g.sceneId)}
                className="text-left border-l border-line/60 px-1.5 py-1 hover:bg-gilt/10 transition-colors group"
                style={{ width: g.span * CELL }}
                title={t("Ouvrir la scène", "Open scene")}
              >
                <div className="text-[10px] uppercase tracking-wide text-ink-faint truncate">{g.act}</div>
                <div className="text-xs font-sans font-semibold text-ink truncate group-hover:text-gilt">{g.title}</div>
              </button>
            ))}
          </div>

          {/* french-scene index row */}
          <div className="flex items-center" style={{ marginLeft: NAMECOL }}>
            {columns.map((c, i) => (
              <div key={i} className="text-center text-[10px] text-ink-faint tnum border-l border-line/30" style={{ width: CELL }}>
                {c.fsIndex}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="mt-1 space-y-0.5">
            {characters.map((ch) => {
              const hex = castHex(ch.color);
              const w = weights.get(ch.id!) ?? 0;
              const gap = gaps.get(ch.id!) ?? 0;
              const thin = w > 0 && w <= Math.max(1, Math.round(columns.length * 0.15));
              return (
                <div key={ch.id} className="flex items-center">
                  <div className="flex items-center gap-2 pr-2 shrink-0" style={{ width: NAMECOL }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hex }} />
                    <span className="font-sans text-sm text-ink truncate">{ch.name || t("(sans nom)", "(unnamed)")}</span>
                    <span className="ml-auto text-[10px] text-ink-faint tnum shrink-0" title={t("scènes françaises", "french-scenes")}>{w}</span>
                  </div>
                  <div className="flex">
                    {columns.map((_, i) => {
                      const on = cellOf.get(`${ch.id}:${i}`) ?? false;
                      return (
                        <div key={i} className="grid place-items-center border-l border-line/20" style={{ width: CELL, height: CELL }}>
                          <div
                            className={`grid-cell rounded-[5px] ${on ? "grid-cell-on" : ""}`}
                            style={{
                              width: on ? 20 : 6,
                              height: on ? 20 : 6,
                              background: on ? hex : "rgb(var(--line) / 0.5)",
                              opacity: on ? 1 : 0.4,
                            }}
                            title={on ? ch.name : ""}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {(thin || gap >= 3) && (
                    <div className="ml-2 shrink-0 flex gap-1">
                      {thin && <Tag color="#d68910">{t("présence mince", "thin presence")}</Tag>}
                      {gap >= 3 && <Tag color="#c0392b">{t(`absent ${gap}×`, `absent ${gap}×`)}</Tag>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend / reading */}
      <p className="text-[12px] text-ink-faint mt-3 font-body text-sm italic max-w-3xl">
        {t(
          "Chiffre à droite de chaque nom = nombre de scènes françaises où le personnage est en scène. Les étiquettes signalent une présence trop mince ou une longue absence — la lecture de la table s'en sert.",
          "The number beside each name = how many french-scenes the character is on stage. The tags flag a thin presence or a long absence — the table-read uses them.",
        )}
      </p>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: color + "22", color }}>
      {children}
    </span>
  );
}
