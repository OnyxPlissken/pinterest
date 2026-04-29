import {
  getPinterestAdminPins,
  getPinterestAdminTree
} from "../../../lib/pinterest-admin";
import { getRuntimeConfig } from "../../../lib/admin-store";
import { normalizeOperationalError } from "../../../lib/operational-errors";
import { getSessionFromRequest } from "../../../lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return Response.json({ error: "Sessione non valida." }, { status: 401 });
  }

  try {
    const runtimeConfig = await getRuntimeConfig();
    const boardId = request.nextUrl.searchParams.get("boardId") || "";
    const sectionId = request.nextUrl.searchParams.get("sectionId") || "";

    if (boardId) {
      const payload = await getPinterestAdminPins(runtimeConfig.config, {
        boardId,
        sectionId
      });
      return Response.json(payload);
    }

    return Response.json(await getPinterestAdminTree(runtimeConfig.config));
  } catch (error) {
    const normalized = normalizeOperationalError(
      error,
      "Lettura amministrazione Pinterest non completata."
    );
    return Response.json({ error: normalized.message }, { status: normalized.status });
  }
}
