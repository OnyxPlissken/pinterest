import { generatePinterestCsv } from "../../../lib/pinterest";
import { normalizeOperationalError } from "../../../lib/operational-errors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await generatePinterestCsv({
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      origin: request.nextUrl.origin
    });

    return Response.json(result);
  } catch (error) {
    const normalized = normalizeOperationalError(
      error,
      "Generazione CSV non completata."
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
