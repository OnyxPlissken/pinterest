import { NextResponse } from "next/server";

import { getAdminState, updateOperationalSettings } from "../../../lib/admin-store";
import { getSessionFromRequest } from "../../../lib/session";

export const runtime = "nodejs";

export async function GET(request) {
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

  try {
    const state = await getAdminState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la lettura impostazioni."
      },
      {
        status: 500
      }
    );
  }
}

export async function PATCH(request) {
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
    const settings = await updateOperationalSettings(body || {});

    return NextResponse.json({
      ok: true,
      settings
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante il salvataggio impostazioni."
      },
      {
        status: 400
      }
    );
  }
}
