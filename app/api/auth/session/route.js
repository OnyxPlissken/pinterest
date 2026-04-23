import { NextResponse } from "next/server";

import { getSessionFromRequest } from "../../../../lib/session";

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

  return NextResponse.json({
    user: session
  });
}

