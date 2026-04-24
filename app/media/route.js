import path from "node:path";

import { getConfig } from "../../lib/config";
import { getSharePointAccessToken } from "../../lib/sharepoint-auth";
import { downloadFileBuffer, inferMimeType } from "../../lib/sharepoint-client";
import { verifyMediaSignature } from "../../lib/media-url";

export const runtime = "nodejs";

function badResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request) {
  const serverRelativeUrl = request.nextUrl.searchParams.get("path")?.trim();
  const signature = request.nextUrl.searchParams.get("sig")?.trim();
  const version = request.nextUrl.searchParams.get("v")?.trim();

  if (!serverRelativeUrl || !signature) {
    return badResponse("Missing media parameters.", 400);
  }

  if (!verifyMediaSignature(serverRelativeUrl, signature, version)) {
    return badResponse("Invalid media signature.", 403);
  }

  try {
    const token = await getSharePointAccessToken();
    const config = getConfig();
    const filename = path.posix.basename(serverRelativeUrl);
    const fileBuffer = await downloadFileBuffer(token, config.sharePoint, serverRelativeUrl);

    return new Response(fileBuffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Type": inferMimeType(filename)
      }
    });
  } catch {
    return badResponse("Unable to load media asset.", 404);
  }
}
