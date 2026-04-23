import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "isaia_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function readSecretCandidate() {
  const candidate =
    process.env.AUTH_SECRET ||
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.SHAREPOINT_CLIENT_SECRET ||
    process.env.SHAREPOINT_PRIVATE_KEY_BASE64 ||
    process.env.SHAREPOINT_PRIVATE_KEY ||
    process.env.BASIC_AUTH_PASSWORD;

  if (!candidate) {
    throw new Error(
      "Serve AUTH_SECRET oppure un segreto server-side gia configurato per firmare la sessione."
    );
  }

  return candidate.trim();
}

function getSessionSecret() {
  return new TextEncoder().encode(readSecretCandidate());
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  };
}

export async function createSessionToken(user) {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token) {
  const rawToken = String(token || "").trim();

  if (!rawToken) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(rawToken, getSessionSecret());

    return {
      id: String(payload.sub || ""),
      username: String(payload.username || ""),
      displayName: String(payload.displayName || payload.username || ""),
      role: String(payload.role || "editor")
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function clearSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...getSessionCookieOptions(),
    maxAge: 0
  });
}

