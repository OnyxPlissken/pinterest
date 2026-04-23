import { NextResponse } from "next/server";

import { getSessionFromRequest } from "../../../lib/session";
import { createUser, listUsers } from "../../../lib/user-store";

export const runtime = "nodejs";

async function requireAdmin(request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Sessione non valida."
        },
        {
          status: 401
        }
      )
    };
  }

  if (session.role !== "admin") {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Questa operazione e riservata agli amministratori."
        },
        {
          status: 403
        }
      )
    };
  }

  return { session };
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const payload = await listUsers();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la lettura utenti."
      },
      {
        status: 500
      }
    );
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const user = await createUser(body || {});

    return NextResponse.json({
      ok: true,
      user
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la creazione utente."
      },
      {
        status: 400
      }
    );
  }
}

