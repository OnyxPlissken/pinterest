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
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = payload?.message || payload?.error || text || "Errore Pinterest API.";
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
    title: input.title,
    description: input.description,
    media_source: {
      source_type: "image_url",
      url: input.mediaUrl
    }
  };

  if (Object.prototype.hasOwnProperty.call(input, "boardSectionId")) {
    body.board_section_id = input.boardSectionId;
  }

  if (Object.prototype.hasOwnProperty.call(input, "link")) {
    body.link = input.link;
  }

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
    body.title = input.title;
  }

  if (Object.prototype.hasOwnProperty.call(input, "description")) {
    body.description = input.description;
  }

  if (Object.prototype.hasOwnProperty.call(input, "boardSectionId")) {
    body.board_section_id = input.boardSectionId;
  }

  if (Object.prototype.hasOwnProperty.call(input, "link")) {
    body.link = input.link;
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
