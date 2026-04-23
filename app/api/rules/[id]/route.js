import { NextResponse } from "next/server";

import { getSessionFromRequest } from "../../../../lib/session";
import { updateRule } from "../../../../lib/admin-store";

export const runtime = "nodejs";

export async function PATCH(request, context) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "Sessione non valida."
      },
      {
        status: 401
      }
    );
  }

  if (session.role !== "admin") {
    return NextResponse.json(
      {
        error: "Questa operazione e riservata agli amministratori."
      },
      {
        status: 403
      }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const params = await context.params;
    const rule = await updateRule(params.id, body || {});

    return NextResponse.json({
      ok: true,
      rule
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante l'aggiornamento regola."
      },
      {
        status: 400
      }
    );
  }
}
