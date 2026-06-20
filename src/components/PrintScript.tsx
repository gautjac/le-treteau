import { ScriptPage } from "./ScriptPage";
import type { Act, Character, Project, Scene } from "../types";

/** The hidden print layer — rendered only when printing (CSS @media print). */
export function PrintScript({
  project,
  acts,
  scenes,
  characters,
}: {
  project: Project;
  acts: Act[];
  scenes: Scene[];
  characters: Character[];
}) {
  const lang = project.language;
  const sortedActs = [...acts].sort((a, b) => a.order - b.order);
  const sortedChars = [...characters].sort((a, b) => a.order - b.order);

  return (
    <div className="print-root" style={{ color: "#16110c", background: "#fff" }}>
      {/* Title page */}
      <div style={{ textAlign: "center", padding: "6cm 0", breakAfter: "page" }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 800, fontSize: "32pt", lineHeight: 1.1 }}>
          {project.title || (lang === "fr" ? "Sans titre" : "Untitled")}
        </div>
        {project.author && (
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "16pt", marginTop: "1cm" }}>
            {lang === "fr" ? "de" : "by"} {project.author}
          </div>
        )}
        {project.logline && (
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: "italic", fontSize: "13pt", marginTop: "1.5cm", maxWidth: "14cm", marginLeft: "auto", marginRight: "auto" }}>
            {project.logline}
          </div>
        )}
        {sortedChars.length > 0 && (
          <div style={{ marginTop: "3cm", fontFamily: '"Cormorant Garamond", serif' }}>
            <div style={{ textTransform: "uppercase", letterSpacing: "0.2em", fontSize: "11pt", marginBottom: "0.6cm" }}>
              {lang === "fr" ? "Personnages" : "Characters"}
            </div>
            {sortedChars.map((c) => (
              <div key={c.id} style={{ fontSize: "12pt", lineHeight: 1.6 }}>
                <b>{c.name}</b>{c.bio ? `, ${c.bio}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acts & scenes */}
      {sortedActs.map((act) => {
        const actScenes = scenes.filter((s) => s.actId === act.id).sort((a, b) => a.order - b.order);
        return (
          <div key={act.id} style={{ breakBefore: "page" }}>
            <div style={{ textAlign: "center", fontFamily: '"Playfair Display", serif', fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: "16pt", margin: "1cm 0 0.6cm" }}>
              {act.title}
            </div>
            {actScenes.map((sc) => (
              <div key={sc.id} style={{ marginBottom: "0.8cm" }}>
                <div style={{ textAlign: "center", fontFamily: '"Cormorant Garamond", serif', textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "13pt", margin: "0.6cm 0 0.3cm" }}>
                  {sc.title}{sc.setting ? ` — ${sc.setting}` : ""}
                </div>
                {sc.script.trim() ? (
                  <div style={{ fontFamily: '"Special Elite", monospace', fontSize: "11pt" }}>
                    <ScriptPage script={sc.script} compact />
                  </div>
                ) : sc.synopsis ? (
                  <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: "italic", textAlign: "center" }}>({sc.synopsis})</div>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
