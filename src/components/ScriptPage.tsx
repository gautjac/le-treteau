import { parseStagePlay, renderEmphasis, type StageElement } from "../lib/stageplay";

/** Live typeset of one scene's stage-play script onto a paper page. */
export function ScriptPage({ script, compact }: { script: string; compact?: boolean }) {
  const els = parseStagePlay(script);
  return (
    <div className={`script-page rounded-lg ${compact ? "p-6 text-[13px]" : "p-8 sm:p-12 text-[15px]"} leading-relaxed`}>
      {els.length === 0 ? (
        <p className="text-center opacity-40 italic" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
          La page est vide. / The page is blank.
        </p>
      ) : (
        els.map((el, i) => <StageLine key={i} el={el} />)
      )}
    </div>
  );
}

function Emph({ text }: { text: string }) {
  return (
    <>
      {renderEmphasis(text).map((s, i) => (
        <span key={i} style={{ fontWeight: s.bold ? 700 : undefined, fontStyle: s.italic ? "italic" : undefined }}>
          {s.text}
        </span>
      ))}
    </>
  );
}

function StageLine({ el }: { el: StageElement }) {
  switch (el.type) {
    case "act-heading":
      return (
        <div className="text-center font-bold tracking-[0.2em] uppercase my-6" style={{ fontSize: "1.05em" }}>
          {el.text}
        </div>
      );
    case "scene-heading":
      return <div className="text-center font-semibold uppercase tracking-wider mt-5 mb-3">{el.text}</div>;
    case "cue":
      return (
        <div className="text-center uppercase font-bold tracking-wide mt-3">
          {el.text}
          {el.cueDirection && <span className="font-normal normal-case italic opacity-80">, {el.cueDirection}</span>}
        </div>
      );
    case "dialogue":
      return (
        <div className="mx-auto" style={{ maxWidth: "30em" }}>
          <Emph text={el.text} />
        </div>
      );
    case "direction":
      return (
        <div className="italic opacity-80 my-2" style={{ marginLeft: "1.5em" }}>
          (<Emph text={el.text} />)
        </div>
      );
    case "centered":
      return (
        <div className="text-center italic my-3 opacity-90">
          <Emph text={el.text} />
        </div>
      );
    default:
      return null;
  }
}
