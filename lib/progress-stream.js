export function createProgressStream(handler, normalizeError) {
  const encoder = new TextEncoder();

  function encodeEvent(event) {
    return encoder.encode(`${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event) => {
        controller.enqueue(encodeEvent({ type: "progress", ...event }));
      };

      try {
        const data = await handler(emit);
        controller.enqueue(encodeEvent({ type: "result", data }));
      } catch (error) {
        const normalized = normalizeError
          ? normalizeError(error)
          : {
              message: error instanceof Error ? error.message : "Operazione non completata.",
              status: 500
            };
        controller.enqueue(
          encodeEvent({
            type: "error",
            error: normalized.message,
            status: normalized.status || 500
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}
