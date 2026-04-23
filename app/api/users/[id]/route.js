import { NextResponse } from "next/server";

import { getSessionFromRequest } from "../../../../lib/session";
import { updateUser } from "../../../../lib/user-store";

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
    const user = await updateUser(params.id, body || {});

    return NextResponse.json({
      ok: true,
      user
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante l'aggiornamento utente."
      },
      {
        status: 400
      }
    );
  }
}

