import { NextResponse } from "next/server";

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ISAIA Pinterest"'
    }
  });
}

function decodeBasicAuth(authorizationHeader) {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  const encoded = authorizationHeader.slice(6).trim();
  let decoded = "";

  try {
    decoded = atob(encoded);
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

export function proxy(request) {
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return NextResponse.next();
  }

  const credentials = decodeBasicAuth(request.headers.get("authorization"));
  if (!credentials) {
    return unauthorized();
  }

  if (credentials.username !== username || credentials.password !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
