import path from "node:path";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function encodeGraphPath(value) {
  const normalized = String(value)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/${normalized}`;
}

async function graphRequest(token, endpoint, options = {}) {
  const response = await fetch(`${GRAPH_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Microsoft Graph ${response.status} su ${endpoint}: ${payload}`);
  }

  return response;
}

async function graphJson(token, endpoint, options = {}) {
  const response = await graphRequest(token, endpoint, options);
  return response.json();
}

function normalizeDriveName(value) {
  return String(value).trim().toLowerCase();
}

export async function resolveSite(token, { hostname, sitePath }) {
  return graphJson(
    token,
    `/sites/${encodeURIComponent(hostname)}:${encodeGraphPath(sitePath)}?$select=id,displayName,webUrl`
  );
}

export async function resolveDrive(token, siteId, driveName) {
  const payload = await graphJson(
    token,
    `/sites/${encodeURIComponent(siteId)}/drives?$select=id,name,webUrl`
  );

  const drive = (payload.value ?? []).find(
    (candidate) => normalizeDriveName(candidate.name) === normalizeDriveName(driveName)
  );

  if (!drive) {
    const available = (payload.value ?? []).map((candidate) => candidate.name).join(", ");
    throw new Error(
      `Libreria SharePoint '${driveName}' non trovata. Disponibili: ${available}`
    );
  }

  return drive;
}

export async function resolveFolder(token, driveId, folderPath) {
  return graphJson(
    token,
    `/drives/${encodeURIComponent(driveId)}/root:${encodeGraphPath(folderPath)}:?$select=id,name,folder,webUrl`
  );
}

async function listChildren(token, driveId, itemId) {
  const results = [];
  let nextUrl = `${GRAPH_BASE_URL}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children?$select=id,name,file,folder,size,webUrl`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Microsoft Graph ${response.status} su children: ${payload}`);
    }

    const page = await response.json();
    results.push(...(page.value ?? []));
    nextUrl = page["@odata.nextLink"] ?? null;
  }

  return results;
}

function isImageFile(filename) {
  return IMAGE_EXTENSIONS.has(path.posix.extname(filename).toLowerCase());
}

export async function collectImageFiles(
  token,
  driveId,
  folderId,
  relativeSegments = []
) {
  const children = await listChildren(token, driveId, folderId);
  const files = [];

  for (const child of children) {
    if (child.folder) {
      const nestedFiles = await collectImageFiles(token, driveId, child.id, [
        ...relativeSegments,
        child.name
      ]);
      files.push(...nestedFiles);
      continue;
    }

    if (!child.file || !isImageFile(child.name)) {
      continue;
    }

    files.push({
      id: child.id,
      name: child.name,
      mimeType: child.file.mimeType ?? "application/octet-stream",
      relativeSegments,
      relativePath: [...relativeSegments, child.name].join("/")
    });
  }

  return files;
}

export async function downloadFileBuffer(token, driveId, itemId) {
  const response = await graphRequest(
    token,
    `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
