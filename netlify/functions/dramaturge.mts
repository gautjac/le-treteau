import type { Context } from "@netlify/functions";
import { runTable, type TableRequest } from "./lib/table.ts";
import { ndjsonStream, json } from "./lib/stream.ts";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: TableRequest;
  try {
    body = (await req.json()) as TableRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.persona) return json({ error: "Missing persona" }, 400);
  if (!body.mode) return json({ error: "Missing mode" }, 400);
  if (body.mode === "sketch") {
    if (!body.premise && !body.project?.logline) {
      return json({ error: "Donnez une prémisse à esquisser." }, 400);
    }
  } else if (!body.target || body.target.trim().length < 3) {
    return json({ error: "Rien à lire — écrivez quelque chose d'abord." }, 400);
  }

  return ndjsonStream(() => runTable(body));
};
