import { previewPinterestSelection } from "../../../lib/pinterest";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { createProgressStream } from "../../../lib/progress-stream";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = {
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      forceRefresh: body?.forceRefresh === true,
      rowEdits: body?.rowEdits ?? [],
      origin: request.nextUrl.origin
    };

    if (body?.streamProgress === true) {
      return createProgressStream(
        (emit) =>
          previewPinterestSelection({
            ...input,
            onProgress: emit
          }),
        (error) => normalizeOperationalError(error, "Anteprima non disponibile.")
      );
    }

    const preview = await previewPinterestSelection({
      ...input
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
