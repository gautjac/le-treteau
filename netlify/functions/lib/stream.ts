/**
 * NDJSON keepalive wrapper. An Opus call can run 25–55s and exceed Netlify's
 * sync/idle timeout (which would return an unparseable HTML error page). We
 * stream NDJSON: a bare-newline heartbeat every ~3s holds the connection open,
 * then a single final JSON line carries the result (or { error }). The client
 * reads to end-of-stream and parses the last non-empty line.
 */
export function ndjsonStream(work: () => Promise<unknown>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = false;
      const beat = setInterval(() => {
        if (!done) {
          try {
            controller.enqueue(enc.encode("\n"));
          } catch {
            /* stream already closed */
          }
        }
      }, 3000);
      try {
        const result = await work();
        done = true;
        clearInterval(beat);
        controller.enqueue(enc.encode(JSON.stringify(result) + "\n"));
      } catch (err) {
        done = true;
        clearInterval(beat);
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(enc.encode(JSON.stringify({ error: message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
