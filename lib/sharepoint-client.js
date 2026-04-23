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
  return `/${normalizeSegments(value)
    .map((segment) => encodeURIComponent(segment).replaceAll("'", "''"))
    .join("/")}`;
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

function toRelativeSubPath(baseFolder, currentFolderPath) {
  const baseSegments = normalizeSegments(baseFolder);
  const currentSegments = normalizeSegments(currentFolderPath);

  if (currentSegments.length <= baseSegments.length) {
    return "";
  }

  return currentSegments.slice(baseSegments.length).join("/");
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

export function inferMimeType(filename) {
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

export async function listFolderEntries(token, config, folderPath) {
  const resolvedFolder = await resolveFolder(token, config, folderPath);

  if (!resolvedFolder.exists) {
    throw new Error(`Il percorso '${folderPath}' non punta a una cartella SharePoint.`);
  }

  const payload = await listFolderChildren(token, config, resolvedFolder.serverRelativeUrl);
  const currentSubPath = toRelativeSubPath(config.baseFolder, folderPath);

  const folders = (payload.Folders ?? [])
    .filter((folder) => folder.Exists && folder.Name !== "Forms")
    .map((folder) => {
      const folderSubPath = toRelativeSubPath(
        config.baseFolder,
        `${folderPath}/${folder.Name}`
      );

      return {
        name: folder.Name,
        type: "folder",
        subPath: folderSubPath,
        displayPath: `${config.baseFolder}/${folderSubPath}`.replace(/\/+$/g, "")
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "it"));

  const files = (payload.Files ?? [])
    .map((file) => ({
      name: file.Name,
      type: "file",
      size: Number(file.Length ?? 0),
      serverRelativeUrl: file.ServerRelativeUrl,
      mimeType: inferMimeType(file.Name),
      isImage: isImageFile(file.Name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "it"));

  const breadcrumbs = [
    {
      label: config.baseFolder.split("/").at(-1) ?? config.baseFolder,
      subPath: "",
      displayPath: config.baseFolder
    }
  ];

  if (currentSubPath) {
    const segments = currentSubPath.split("/").filter(Boolean);
    for (let index = 0; index < segments.length; index += 1) {
      const subPath = segments.slice(0, index + 1).join("/");
      breadcrumbs.push({
        label: segments[index],
        subPath,
        displayPath: `${config.baseFolder}/${subPath}`
      });
    }
  }

  return {
    currentSubPath,
    displayPath: currentSubPath
      ? `${config.baseFolder}/${currentSubPath}`
      : config.baseFolder,
    folders,
    files,
    breadcrumbs,
    canGenerate: currentSubPath.split("/").filter(Boolean).length >= 3
  };
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
