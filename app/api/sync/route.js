import { syncPinterestPins } from "../../../lib/pinterest-sync";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { getSessionFromRequest } from "../../../lib/session";
import { createProgressStream } from "../../../lib/progress-stream";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return Response.json(
      {
        error: "Sessione non valida."
      },
      {
        status: 401
      }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = {
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      dryRun: body?.dryRun === true,
      boardPrivacy: body?.boardPrivacy ?? body?.pinPrivacy ?? "PUBLIC",
      rowEdits: body?.rowEdits ?? [],
      origin: request.nextUrl.origin
    };

    if (body?.streamProgress === true) {
      return createProgressStream(
        (emit) =>
          syncPinterestPins({
            ...input,
            onProgress: emit
          }),
        (error) => normalizeOperationalError(error, "Sync Pinterest non completato.")
      );
    }

    const result = await syncPinterestPins(input);

    return Response.json(result);
  } catch (error) {
    const normalized = normalizeOperationalError(error, "Sync Pinterest non completato.");
    return Response.json(
      {
        error: normalized.message
      },
      {
        status: normalized.status
      }
    );
  }
}
