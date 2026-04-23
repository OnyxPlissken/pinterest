import { previewPinterestSelection } from "../../../lib/pinterest";
import { normalizeOperationalError } from "../../../lib/operational-errors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const preview = await previewPinterestSelection({
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      origin: request.nextUrl.origin
    });

    return Response.json(preview);
  } catch (error) {
    const normalized = normalizeOperationalError(
      error,
      "Anteprima non disponibile."
    );
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
