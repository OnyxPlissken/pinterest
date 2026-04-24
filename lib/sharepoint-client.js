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

const digestCache = new Map();

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

async function sharePointFetch(token, config, endpoint, options = {}) {
  const response = await fetch(`${getSiteBaseUrl(config)}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json;odata=nometadata",
      ...(options.body ? { "Content-Type": "application/json;odata=nometadata" } : {}),
      ...(options.headers ?? {})
    }
  });

  return response;
}

async function sharePointRequest(token, config, endpoint, options = {}) {
  const response = await sharePointFetch(token, config, endpoint, options);

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

function getFileEndpoint(serverRelativePath) {
  return `/_api/web/GetFileByServerRelativePath(decodedurl='${encodeServerRelativePath(serverRelativePath)}')`;
}

async function getRequestDigest(token, config) {
  const cacheKey = `${config.hostname}${config.sitePath}`;
  const cached = digestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 10_000) {
    return cached.value;
  }

  const response = await sharePointFetch(token, config, "/_api/contextinfo", {
    method: "POST",
    headers: {
      Accept: "application/json;odata=nometadata"
    }
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`SharePoint REST ${response.status} su /_api/contextinfo: ${payload}`);
  }

  const payload = await response.json();
  const value = payload.FormDigestValue;
  const timeoutSeconds = Number(payload.FormDigestTimeoutSeconds ?? 900);

  if (!value) {
    throw new Error("SharePoint non ha restituito un form digest valido.");
  }

  digestCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + timeoutSeconds * 1000
  });

  return value;
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
    `${getFolderEndpoint(serverRelativePath)}?$select=Name,ServerRelativeUrl,Folders/Name,Folders/ServerRelativeUrl,Folders/Exists,Files/Name,Files/ServerRelativeUrl,Files/Length,Files/TimeLastModified,Files/UniqueId&$expand=Folders,Files`
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
      serverRelativeUrl: file.ServerRelativeUrl,
      size: Number(file.Length ?? 0),
      modifiedAt: file.TimeLastModified || "",
      uniqueId: file.UniqueId || ""
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
      isImage: isImageFile(file.Name),
      modifiedAt: file.TimeLastModified || "",
      uniqueId: file.UniqueId || ""
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
    `${getFileEndpoint(serverRelativePath)}/$value`,
    {
      headers: {
        Accept: "*/*"
      }
    }
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function ensureFolderPath(token, config, folderPath) {
  const segments = normalizeSegments(folderPath);
  if (!segments.length) {
    return;
  }

  let currentPath = "";
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const folder = await resolveFolder(token, config, currentPath).catch(() => ({
      exists: false
    }));

    if (folder.exists) {
      continue;
    }

    const digest = await getRequestDigest(token, config);
    const serverRelativePath = buildServerRelativeFolderPath(config, currentPath);
    await sharePointRequest(
      token,
      config,
      `/_api/web/Folders/AddUsingPath(decodedurl='${encodeServerRelativePath(serverRelativePath)}')`,
      {
        method: "POST",
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=nometadata",
          "X-RequestDigest": digest
        }
      }
    );
  }
}

export async function readTextFile(token, config, filePath) {
  const serverRelativePath = buildServerRelativeFolderPath(config, filePath);
  const response = await sharePointFetch(token, config, `${getFileEndpoint(serverRelativePath)}/$value`, {
    cache: "no-store",
    headers: {
      Accept: "text/plain"
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`SharePoint REST ${response.status} su ${getFileEndpoint(serverRelativePath)}/$value: ${payload}`);
  }

  return response.text();
}

export async function writeTextFile(token, config, filePath, content) {
  const segments = normalizeSegments(filePath);
  const filename = segments.pop();

  if (!filename) {
    throw new Error("Percorso file SharePoint non valido.");
  }

  const folderPath = segments.join("/");
  if (folderPath) {
    await ensureFolderPath(token, config, folderPath);
  }

  const digest = await getRequestDigest(token, config);
  const serverRelativeFolderPath = buildServerRelativeFolderPath(config, folderPath);
  const encodedFilename = encodeURIComponent(filename).replaceAll("'", "''");

  await sharePointRequest(
    token,
    config,
    `${getFolderEndpoint(serverRelativeFolderPath)}/Files/add(url='${encodedFilename}',overwrite=true)`,
    {
      method: "POST",
      headers: {
        Accept: "application/json;odata=nometadata",
        "Content-Type": "text/plain; charset=utf-8",
        "X-RequestDigest": digest
      },
      body: String(content ?? "")
    }
  );

  return `${folderPath ? `${folderPath}/` : ""}${filename}`;
}
