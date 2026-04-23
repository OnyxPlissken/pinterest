import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MIME_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function getSiteBaseUrl({ hostname, sitePath }) {
  return `https://${hostname}${sitePath}`;
}

function normalizeSegments(value) {
  return String(value)
    .split("/")
    .filter(Boolean);
}

function encodeServerRelativePath(value) {
  return `/${normalizeSegments(value).map((segment) => encodeURIComponent(segment)).join("/")}`;
}

function buildServerRelativeFolderPath(config, folderPath) {
  return [
    config.sitePath,
    config.driveName,
    folderPath
  ]
    .flatMap((value) => normalizeSegments(value))
    .join("/");
}

async function sharePointRequest(token, config, endpoint, options = {}) {
  const response = await fetch(`${getSiteBaseUrl(config)}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      ...(options.body ? { "Content-Type": "application/json;odata=nometadata" } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`SharePoint REST ${response.status} su ${endpoint}: ${payload}`);
  }

  return response;
}

async function sharePointJson(token, config, endpoint, options = {}) {
  const response = await sharePointRequest(token, config, endpoint, options);
  return response.json();
}

function getFolderEndpoint(serverRelativePath) {
  return `/_api/web/GetFolderByServerRelativePath(decodedurl='${encodeServerRelativePath(serverRelativePath)}')`;
}

export async function resolveSite(token, config) {
  return sharePointJson(
    token,
    config,
    "/_api/web?$select=Id,Title,ServerRelativeUrl,Url"
  );
}

export async function resolveFolder(token, config, folderPath) {
  const serverRelativePath = buildServerRelativeFolderPath(config, folderPath);
  const payload = await sharePointJson(
    token,
    config,
    `${getFolderEndpoint(serverRelativePath)}?$select=Exists,Name,ServerRelativeUrl,ItemCount`
  );

  return {
    exists: payload.Exists,
    name: payload.Name,
    serverRelativeUrl: payload.ServerRelativeUrl,
    itemCount: payload.ItemCount ?? 0
  };
}

async function listFolderChildren(token, config, serverRelativePath) {
  return sharePointJson(
    token,
    config,
    `${getFolderEndpoint(serverRelativePath)}?$select=Name,ServerRelativeUrl,Folders/Name,Folders/ServerRelativeUrl,Folders/Exists,Files/Name,Files/ServerRelativeUrl,Files/Length&$expand=Folders,Files`
  );
}

function isImageFile(filename) {
  return IMAGE_EXTENSIONS.has(path.posix.extname(filename).toLowerCase());
}

function inferMimeType(filename) {
  return MIME_TYPES.get(path.posix.extname(filename).toLowerCase()) ?? "application/octet-stream";
}

export async function collectImageFiles(
  token,
  config,
  folderServerRelativePath,
  relativeSegments = []
) {
  const payload = await listFolderChildren(token, config, folderServerRelativePath);
  const files = [];

  for (const folder of payload.Folders ?? []) {
    if (!folder.Exists || folder.Name === "Forms") {
      continue;
    }

    const nestedFiles = await collectImageFiles(token, config, folder.ServerRelativeUrl, [
      ...relativeSegments,
      folder.Name
    ]);
    files.push(...nestedFiles);
  }

  for (const file of payload.Files ?? []) {
    if (!isImageFile(file.Name)) {
      continue;
    }

    files.push({
      name: file.Name,
      mimeType: inferMimeType(file.Name),
      relativeSegments,
      relativePath: [...relativeSegments, file.Name].join("/"),
      serverRelativeUrl: file.ServerRelativeUrl
    });
  }

  return files;
}

export async function downloadFileBuffer(token, config, serverRelativePath) {
  const response = await sharePointRequest(
    token,
    config,
    `/_api/web/GetFileByServerRelativePath(decodedurl='${encodeServerRelativePath(serverRelativePath)}')/$value`,
    {
      headers: {
        Accept: "*/*"
      }
    }
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
