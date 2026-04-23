import { NextResponse } from "next/server";

import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "../../../../lib/session";
import { authenticateUser, touchUserLastLogin } from "../../../../lib/user-store";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await authenticateUser(body?.username, body?.password);

    if (!user) {
      return NextResponse.json(
        {
          error: "Credenziali non valide."
        },
        {
          status: 401
        }
      );
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({
      ok: true,
      user
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...getSessionCookieOptions()
    });

    await touchUserLastLogin(user.id).catch(() => null);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Errore durante il login."
      },
      {
        status: 500
      }
    );
  }
}

