import { generateCsvAssist, previewCsvAssist } from "../../../lib/pinterest-csv-assist";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { getSessionFromRequest } from "../../../lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return Response.json({ error: "Sessione non valida." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = {
      subPaths: body?.subPaths ?? [],
      subPath: body?.subPath ?? "",
      ruleId: body?.ruleId ?? "",
      strategy: body?.strategy ?? "newOnly",
      directImport: body?.directImport === true,
      origin: request.nextUrl.origin
    };

    if (body?.action === "generate") {
      if (session.role !== "admin") {
        return Response.json(
          { error: "Questa operazione e riservata agli amministratori." },
          { status: 403 }
        );
      }

      return Response.json(await generateCsvAssist(input));
    }

    return Response.json(await previewCsvAssist(input));
  } catch (error) {
    const normalized = normalizeOperationalError(
      error,
      "CSV Sync Assist non completato."
    );
    return Response.json({ error: normalized.message }, { status: normalized.status });
  }
}
