import { NextResponse } from "next/server";

import {
  createSessionToken,
  getSessionCookieOptions,
  getSessionFromRequest,
  SESSION_COOKIE_NAME
} from "../../../../lib/session";
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

  const params = await context.params;
  const isSelf = params.id === session.id;

  if (session.role !== "admin" && !isSelf) {
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
    const updatePayload =
      session.role === "admin"
        ? body || {}
        : {
            displayName: body?.displayName,
            password: body?.password
          };
    const user = await updateUser(params.id, updatePayload);

    const response = NextResponse.json({
      ok: true,
      user
    });

    if (isSelf) {
      const token = await createSessionToken(user);
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        ...getSessionCookieOptions()
      });
    }

    return response;
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
