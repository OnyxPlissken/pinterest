import { NextResponse } from "next/server";

import { createRule, getAdminState } from "../../../lib/admin-store";
import { getSessionFromRequest } from "../../../lib/session";

export const runtime = "nodejs";

async function requireSession(request) {
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

  return { session };
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  try {
    const state = await getAdminState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la lettura regole."
      },
      {
        status: 500
      }
    );
  }
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  if (auth.session.role !== "admin") {
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
    const rule = await createRule(body || {});

    return NextResponse.json({
      ok: true,
      rule
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante la creazione regola."
      },
      {
        status: 400
      }
    );
  }
}
