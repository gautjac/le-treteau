import type { Context } from "@netlify/functions";
import { runBreakdown, type BreakdownRequest } from "./lib/table.ts";
import { ndjsonStream, json } from "./lib/stream.ts";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: BreakdownRequest;
  try {
    body = (await req.json()) as BreakdownRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.premise || body.premise.trim().length < 8) {
    return json({ error: "Donnez une prémisse (au moins une phrase)." }, 400);
  }

  return ndjsonStream(() => runBreakdown(body));
};
