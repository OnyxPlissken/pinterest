const PINTEREST_API_BASE = "https://api.pinterest.com/v5";

let tokenRefresher = null;

export function setPinterestTokenRefresher(refresher) {
  tokenRefresher = refresher;
}

function getPinterestAccessToken(config) {
  const token = String(config?.pinterest?.accessToken || process.env.PINTEREST_ACCESS_TOKEN || "").trim();

  if (!token) {
    throw new Error("Configura PINTEREST_ACCESS_TOKEN nelle impostazioni o nelle variabili ambiente.");
  }

  return token;
}

function normalizeOptionalString(value) {
  return String(value ?? "").trim();
}

function setNonEmptyString(target, key, value) {
  const normalized = normalizeOptionalString(value);

  if (normalized) {
    target[key] = normalized;
  }
}

function parsePinterestPayload(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractPinterestErrorDetail(payload, text) {
  if (payload?.message) {
    return payload.message;
  }

  if (payload?.error_description) {
    return payload.error_description;
  }

  if (payload?.error) {
    return typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error);
  }

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    return payload.errors
      .map((entry) => entry.message || entry.detail || entry.reason || JSON.stringify(entry))
      .filter(Boolean)
      .join("; ");
  }

  if (payload?.code) {
    return String(payload.code);
  }

  return text || "Errore Pinterest API.";
}

async function pinterestRequest(config, endpoint, options = {}) {
  const buildRequest = (accessToken) => ({
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  let accessToken = getPinterestAccessToken(config);
  let response = await fetch(`${PINTEREST_API_BASE}${endpoint}`, buildRequest(accessToken));

  if (response.status === 401 && tokenRefresher) {
    const refreshed = await tokenRefresher(config).catch(() => null);
    if (refreshed?.accessToken) {
      config.pinterest.accessToken = refreshed.accessToken;
      accessToken = refreshed.accessToken;
      response = await fetch(`${PINTEREST_API_BASE}${endpoint}`, buildRequest(accessToken));
    }
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const payload = parsePinterestPayload(text);

  if (!response.ok) {
    const detail = extractPinterestErrorDetail(payload, text);
    throw new Error(`Pinterest API ${response.status} su ${endpoint}: ${detail}`);
  }

  return payload;
}

async function listPaginated(config, endpoint) {
  const items = [];
  let bookmark = "";

  do {
    const separator = endpoint.includes("?") ? "&" : "?";
    const pageSizeParam = endpoint.includes("page_size=") ? "" : `${separator}page_size=100`;
    const bookmarkSeparator = endpoint.includes("?") || pageSizeParam ? "&" : "?";
    const pageEndpoint = `${endpoint}${pageSizeParam}${
      bookmark ? `${bookmarkSeparator}bookmark=${encodeURIComponent(bookmark)}` : ""
    }`;
    const payload = await pinterestRequest(config, pageEndpoint);

    items.push(...(payload?.items ?? []));
    bookmark = payload?.bookmark || "";
  } while (bookmark);

  return items;
}

export { pinterestRequest };

export async function listPinterestBoards(config, { includePrivate = true } = {}) {
  if (!includePrivate) {
    return listPaginated(config, "/boards");
  }

  const byId = new Map();
  const privacyFilters = [
    "",
    "ALL",
    "PUBLIC_AND_SECRET",
    "PUBLIC",
    "PROTECTED",
    "SECRET",
    "all",
    "public_and_secret",
    "public",
    "protected",
    "secret"
  ];

  for (const privacy of privacyFilters) {
    const endpoint = privacy ? `/boards?privacy=${encodeURIComponent(privacy)}` : "/boards";
    const boards = await listPaginated(config, endpoint).catch((error) => {
      if (!privacy) {
        throw error;
      }

      return [];
    });

    for (const board of boards) {
      byId.set(board.id, board);
    }
  }

  return Array.from(byId.values()).sort((left, right) =>
    String(left.name || "").localeCompare(String(right.name || ""), "it")
  );
}

export async function createPinterestBoard(config, name) {
  return pinterestRequest(config, "/boards", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "PUBLIC"
    })
  });
}

export async function updatePinterestBoard(config, boardId, input) {
  const body = {};

  if (Object.prototype.hasOwnProperty.call(input, "privacy")) {
    body.privacy = input.privacy;
  }

  return pinterestRequest(config, `/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function listPinterestBoardSections(config, boardId) {
  return listPaginated(config, `/boards/${encodeURIComponent(boardId)}/sections`);
}

export async function listPinterestBoardPins(config, boardId) {
  return listPaginated(config, `/boards/${encodeURIComponent(boardId)}/pins`);
}

export async function listPinterestBoardSectionPins(config, boardId, sectionId) {
  return listPaginated(
    config,
    `/boards/${encodeURIComponent(boardId)}/sections/${encodeURIComponent(sectionId)}/pins`
  );
}

export async function createPinterestBoardSection(config, boardId, name) {
  return pinterestRequest(config, `/boards/${encodeURIComponent(boardId)}/sections`, {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export async function createPinterestPin(config, input) {
  const body = {
    board_id: input.boardId,
    title: normalizeOptionalString(input.title),
    description: normalizeOptionalString(input.description),
    media_source: {
      source_type: "image_url",
      url: normalizeOptionalString(input.mediaUrl)
    }
  };

  setNonEmptyString(body, "board_section_id", input.boardSectionId);
  setNonEmptyString(body, "link", input.link);

  return pinterestRequest(config, "/pins", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updatePinterestPin(config, pinId, input) {
  const body = {
    board_id: input.boardId
  };

  if (Object.prototype.hasOwnProperty.call(input, "title")) {
    body.title = normalizeOptionalString(input.title);
  }

  if (Object.prototype.hasOwnProperty.call(input, "description")) {
    body.description = normalizeOptionalString(input.description);
  }

  if (Object.prototype.hasOwnProperty.call(input, "boardSectionId") && input.boardSectionId) {
    setNonEmptyString(body, "board_section_id", input.boardSectionId);
  }

  if (Object.prototype.hasOwnProperty.call(input, "link") && input.link) {
    setNonEmptyString(body, "link", input.link);
  }

  if (Object.prototype.hasOwnProperty.call(input, "privacy")) {
    body.privacy = input.privacy;
  }

  return pinterestRequest(config, `/pins/${encodeURIComponent(pinId)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deletePinterestPin(config, pinId) {
  return pinterestRequest(config, `/pins/${encodeURIComponent(pinId)}`, {
    method: "DELETE"
  });
}
