import {
  createPinterestAdminBoard,
  createPinterestAdminSection,
  deletePinterestAdminPins,
  getPinterestAdminPins,
  getPinterestAdminTree,
  updatePinterestAdminBoardPrivacy,
  updatePinterestAdminPin
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

export async function POST(request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return Response.json({ error: "Sessione non valida." }, { status: 401 });
  }

  if (session.role !== "admin") {
    return Response.json(
      { error: "Questa operazione e riservata agli amministratori." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const runtimeConfig = await getRuntimeConfig();

    if (body?.action === "update") {
      return Response.json(
        await updatePinterestAdminPin(runtimeConfig.config, {
          pinId: body.pinId,
          boardId: body.boardId,
          sectionId: body.sectionId || "",
          title: body.title,
          description: body.description,
          link: body.link,
          privacy: body.privacy
        })
      );
    }

    if (body?.action === "updateBoardPrivacy") {
      return Response.json(
        await updatePinterestAdminBoardPrivacy(runtimeConfig.config, {
          boardId: body.boardId,
          privacy: body.privacy
        })
      );
    }

    if (body?.action === "createBoard") {
      return Response.json(
        await createPinterestAdminBoard(runtimeConfig.config, {
          name: body.name,
          privacy: body.privacy || "SECRET"
        })
      );
    }

    if (body?.action === "createSection") {
      return Response.json(
        await createPinterestAdminSection(runtimeConfig.config, {
          boardId: body.boardId,
          name: body.name
        })
      );
    }

    if (body?.action === "delete") {
      return Response.json(
        await deletePinterestAdminPins(runtimeConfig.config, {
          pinIds: body.pinIds
        })
      );
    }

    throw new Error("Azione Pinterest non supportata.");
  } catch (error) {
    const normalized = normalizeOperationalError(
      error,
      "Operazione amministrativa Pinterest non completata."
    );
    return Response.json({ error: normalized.message }, { status: normalized.status });
  }
}
