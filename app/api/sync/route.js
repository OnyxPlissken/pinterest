import { syncPinterestPins } from "../../../lib/pinterest-sync";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { getSessionFromRequest } from "../../../lib/session";

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
    const result = await syncPinterestPins({
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      dryRun: body?.dryRun === true,
      origin: request.nextUrl.origin
    });

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
