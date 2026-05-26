import path from "node:path";

import { getConfig } from "../../lib/config";
import { getSharePointAccessToken } from "../../lib/sharepoint-auth";
import { downloadFileBuffer, inferMimeType, isTiffImage } from "../../lib/sharepoint-client";
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

function parseSignedMediaRequest(request) {
  const serverRelativeUrl = request.nextUrl.searchParams.get("path")?.trim();
  const signature = request.nextUrl.searchParams.get("sig")?.trim();
  const version = request.nextUrl.searchParams.get("v")?.trim();

  if (!serverRelativeUrl || !signature) {
    return {
      errorResponse: badResponse("Missing media parameters.", 400)
    };
  }

  if (!verifyMediaSignature(serverRelativeUrl, signature, version)) {
    return {
      errorResponse: badResponse("Invalid media signature.", 403)
    };
  }

  return {
    serverRelativeUrl
  };
}

function getPublicMediaFilename(filename) {
  if (!isTiffImage(filename)) {
    return filename;
  }

  return `${path.posix.basename(filename, path.posix.extname(filename))}.jpg`;
}

function getPublicMediaType(filename) {
  return isTiffImage(filename) ? "image/jpeg" : inferMimeType(filename);
}

async function prepareMediaBuffer(fileBuffer, filename) {
  if (!isTiffImage(filename)) {
    return fileBuffer;
  }

  const { default: sharp } = await import("sharp");
  return sharp(fileBuffer, { pages: 1 })
    .rotate()
    .flatten({ background: "#ffffff" })
    .jpeg({
      quality: 92,
      mozjpeg: true
    })
    .toBuffer();
}

export async function HEAD(request) {
  const parsed = parseSignedMediaRequest(request);
  if (parsed.errorResponse) {
    return parsed.errorResponse;
  }

  const filename = path.posix.basename(parsed.serverRelativeUrl);

  return new Response(null, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": getPublicMediaType(filename)
    }
  });
}

export async function GET(request) {
  const parsed = parseSignedMediaRequest(request);
  if (parsed.errorResponse) {
    return parsed.errorResponse;
  }

  try {
    const token = await getSharePointAccessToken();
    const config = getConfig();
    const filename = path.posix.basename(parsed.serverRelativeUrl);
    const fileBuffer = await downloadFileBuffer(token, config.sharePoint, parsed.serverRelativeUrl);
    const publicBuffer = await prepareMediaBuffer(fileBuffer, filename);
    const publicFilename = getPublicMediaFilename(filename);

    return new Response(publicBuffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(publicFilename)}`,
        "Content-Type": getPublicMediaType(filename)
      }
    });
  } catch {
    return badResponse("Unable to load media asset.", 404);
  }
}
