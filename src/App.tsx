import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, readSettings, ensureSettings, setSettings } from "./db";
import { useLang } from "./i18n";
import { Onboarding } from "./components/Onboarding";
import { BoardView } from "./components/BoardView";
import { CastView } from "./components/CastView";
import { PresenceGridView } from "./components/PresenceGridView";
import { SceneEditor } from "./components/SceneEditor";
import { TablePanel } from "./components/TablePanel";
import { ExportView } from "./components/ExportView";
import { PrintScript } from "./components/PrintScript";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import { LangToggle, ThemeToggle } from "./components/ui";
import type { Act, Character, Project, Scene, Settings } from "./types";

type View = "board" | "grid" | "cast" | "scene" | "export";

interface TableTarget {
  kind: "scene" | "structure";
  sceneId?: number;
  text: string;
  label: string;
}

export default function App() {
  const { t } = useLang();
  const settings = useLiveQuery(async () => await readSettings(), []) as Settings | undefined;

  useEffect(() => {
    ensureSettings();
  }, []);

  const projects = useLiveQuery(
    async () => (await db.projects.toArray()).sort((a, b) => b.updatedAt - a.updatedAt),
    [],
  ) as Project[] | undefined;

  const [view, setView] = useState<View>("board");
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);
  const [selection, setSelection] = useState("");
  const [forceOnboard, setForceOnboard] = useState(false);
  const insertRef = useRef<(script: string) => void>(() => {});

  const theme = settings?.theme ?? "dark";
  // Apply theme to <html data-theme>.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const activeProjectId = settings?.activeProjectId;
  const project = useLiveQuery(
    async () => (activeProjectId ? ((await db.projects.get(activeProjectId)) ?? null) : null),
    [activeProjectId],
  ) as Project | null | undefined;

  // Data for the print layer.
  const acts = useLiveQuery(
    async () => (project ? ((await db.acts.where("projectId").equals(project.id!).toArray()) as Act[]) : []),
    [project?.id],
  ) as Act[] | undefined;
  const scenes = useLiveQuery(
    async () => (project ? ((await db.scenes.where("projectId").equals(project.id!).toArray()) as Scene[]) : []),
    [project?.id],
  ) as Scene[] | undefined;
  const characters = useLiveQuery(
    async () => (project ? ((await db.characters.where("projectId").equals(project.id!).toArray()) as Character[]) : []),
    [project?.id],
  ) as Character[] | undefined;

  const activeScene = useLiveQuery(
    async () => (activeSceneId ? ((await db.scenes.get(activeSceneId)) ?? null) : null),
    [activeSceneId],
  ) as Scene | null | undefined;

  // Pick a project if active vanished.
  useEffect(() => {
    if (!settings || !projects) return;
    if (settings.onboarded && projects.length > 0) {
      const exists = projects.some((p) => p.id === settings.activeProjectId);
      if (!exists) setSettings({ activeProjectId: projects[0].id });
    }
  }, [settings, projects]);

  const registerInsert = useCallback((fn: (s: string) => void) => {
    insertRef.current = fn;
  }, []);

  function openScene(sceneId: number) {
    setActiveSceneId(sceneId);
    setView("scene");
  }

  // Build the table target from the active scene (or the whole structure).
  function sceneTarget(): TableTarget | null {
    if (view === "scene" && activeScene) {
      const dram = [
        activeScene.synopsis && `Synopsis: ${activeScene.synopsis}`,
        activeScene.dramaticQuestion && `Question dramatique: ${activeScene.dramaticQuestion}`,
        activeScene.objective && `Objectif: ${activeScene.objective}`,
        activeScene.obstacle && `Obstacle: ${activeScene.obstacle}`,
        activeScene.tactic && `Tactique: ${activeScene.tactic}`,
        activeScene.turningPoint && `Point de bascule: ${activeScene.turningPoint}`,
        activeScene.stakes && `Enjeux: ${activeScene.stakes}`,
      ].filter(Boolean).join("\n");
      const text = [
        `${activeScene.title}${activeScene.setting ? ` — ${activeScene.setting}` : ""}`,
        dram,
        activeScene.script.trim() ? `\nTEXTE:\n${activeScene.script}` : "",
      ].filter(Boolean).join("\n");
      return { kind: "scene", sceneId: activeScene.id!, text, label: activeScene.title || t("Scène", "Scene") };
    }
    return null;
  }

  function structureTarget(): TableTarget | null {
    if (!acts || !scenes) return null;
    const lines: string[] = [];
    for (const a of [...acts].sort((x, y) => x.order - y.order)) {
      lines.push(`# ${a.title}`);
      for (const s of scenes.filter((s) => s.actId === a.id).sort((x, y) => x.order - y.order)) {
        lines.push(`## ${s.title}${s.setting ? ` — ${s.setting}` : ""}`);
        if (s.synopsis) lines.push(`   ${s.synopsis}`);
        const d = [s.objective && `obj:${s.objective}`, s.turningPoint && `bascule:${s.turningPoint}`, s.stakes && `enjeux:${s.stakes}`].filter(Boolean).join(" · ");
        if (d) lines.push(`   ${d}`);
      }
    }
    if (lines.length === 0) return null;
    return { kind: "structure", text: lines.join("\n"), label: t("Structure entière", "Whole structure") };
  }

  // ── gates ──
  if (!settings || projects === undefined) {
    return <div className="min-h-screen grid place-items-center text-ink-faint">…</div>;
  }
  if (!settings.onboarded || projects.length === 0 || forceOnboard) {
    return (
      <Onboarding
        onDone={async (id) => {
          await setSettings({ onboarded: true, activeProjectId: id });
          setForceOnboard(false);
          setView("board");
        }}
      />
    );
  }
  if (project === undefined) return <div className="min-h-screen grid place-items-center text-ink-faint">…</div>;
  if (project === null) return <div className="min-h-screen grid place-items-center text-ink-faint">…</div>;

  const NAV: { id: View; label: string; glyph: string }[] = [
    { id: "board", label: t("Plateau", "Board"), glyph: "▤" },
    { id: "grid", label: t("Présence", "Presence"), glyph: "▦" },
    { id: "cast", label: t("Distribution", "Cast"), glyph: "☻" },
    { id: "scene", label: t("Scène", "Scene"), glyph: "❡" },
    { id: "export", label: t("Exporter", "Export"), glyph: "⎙" },
  ];

  const target = view === "scene" ? sceneTarget() : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="curtain-fringe opacity-70" />
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-2 mr-1">
            <span className="text-gilt text-lg">❦</span>
            <span className="font-display font-bold tracking-tight gilt-text hidden sm:inline">Le&nbsp;Tréteau</span>
          </div>

          <ProjectSwitcher
            active={project}
            onSwitch={(id) => {
              setSettings({ activeProjectId: id });
              setActiveSceneId(null);
              setSelection("");
              setView("board");
            }}
            onNew={() => setForceOnboard(true)}
          />

          <nav className="ml-auto flex items-center gap-1 bg-surface-2/60 border border-line rounded-xl p-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-sans font-medium transition-colors flex items-center gap-1.5 ${
                  view === n.id ? "bg-gilt/15 text-gilt" : "text-ink-dim hover:text-ink"
                }`}
              >
                <span className="text-xs">{n.glyph}</span>
                <span className="hidden md:inline">{n.label}</span>
              </button>
            ))}
          </nav>

          <ThemeToggle theme={theme} onToggle={() => setSettings({ theme: theme === "dark" ? "light" : "dark" })} />
          <LangToggle />
        </div>
      </header>

      <main className="no-print flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 py-6">
        {view === "board" && <BoardView project={project} onOpenScene={openScene} />}
        {view === "grid" && <PresenceGridView project={project} onOpenScene={openScene} />}
        {view === "cast" && <CastView project={project} />}
        {view === "export" && <ExportView project={project} onImported={(id) => {
          setSettings({ activeProjectId: id });
          setActiveSceneId(null);
          setView("board");
        }} />}

        {view === "scene" && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            <SceneEditor
              project={project}
              sceneId={activeSceneId}
              onSelectionChange={setSelection}
              registerInsert={registerInsert}
            />
            <aside className="xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              <TablePanel
                project={project}
                target={target}
                selection={selection}
                onInsert={(s) => insertRef.current(s)}
              />
            </aside>
          </div>
        )}
      </main>

      {/* Print layer */}
      {acts && scenes && characters && (
        <PrintScript project={project} acts={acts} scenes={scenes} characters={characters} />
      )}

      <footer className="no-print border-t border-line py-4 text-center text-[11px] text-ink-faint font-sans">
        Le Tréteau · {t("studio de dramaturgie", "dramaturgy studio")} · {t("local, privé, sans compte", "local, private, no account")}
      </footer>

      {/* Structure-level table-read launcher (floating) when on the grid/board */}
      {(view === "grid" || view === "board") && (
        <StructureTableLauncher project={project} makeTarget={structureTarget} />
      )}
    </div>
  );
}

/** A floating "ask the table about the whole structure" button + drawer. */
function StructureTableLauncher({
  project,
  makeTarget,
}: {
  project: Project;
  makeTarget: () => TableTarget | null;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const target = makeTarget();

  return (
    <>
      <button
        className="no-print fixed bottom-5 right-5 z-30 btn-velvet px-4 py-3 text-sm shadow-proscenium flex items-center gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-base">☷</span>
        <span className="hidden sm:inline">{t("La table", "The Table")}</span>
      </button>
      {open && (
        <div className="no-print fixed inset-0 z-40 flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md h-full overflow-y-auto bg-surface border-l border-line p-4 animate-riseIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-xl text-ink">{t("Lecture de la structure", "Structure read")}</h3>
              <button className="btn-ghost px-2 py-1 text-sm" onClick={() => setOpen(false)}>✕</button>
            </div>
            <TablePanel project={project} target={target} selection="" onInsert={() => {}} />
          </div>
        </div>
      )}
    </>
  );
}
