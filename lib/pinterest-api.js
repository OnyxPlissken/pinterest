const PINTEREST_API_BASE = "https://api.pinterest.com/v5";

function getPinterestAccessToken(config) {
  const token = String(config?.pinterest?.accessToken || process.env.PINTEREST_ACCESS_TOKEN || "").trim();

  if (!token) {
    throw new Error("Configura PINTEREST_ACCESS_TOKEN nelle impostazioni o nelle variabili ambiente.");
  }

  return token;
}

async function pinterestRequest(config, endpoint, options = {}) {
  const response = await fetch(`${PINTEREST_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPinterestAccessToken(config)}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });

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
    const pageEndpoint = bookmark
      ? `${endpoint}${separator}bookmark=${encodeURIComponent(bookmark)}`
      : endpoint;
    const payload = await pinterestRequest(config, pageEndpoint);

    items.push(...(payload?.items ?? []));
    bookmark = payload?.bookmark || "";
  } while (bookmark);

  return items;
}

export async function listPinterestBoards(config) {
  return listPaginated(config, "/boards");
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

  if (input.boardSectionId) {
    body.board_section_id = input.boardSectionId;
  }

  if (input.link) {
    body.link = input.link;
  }

  return pinterestRequest(config, "/pins", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function updatePinterestPin(config, pinId, input) {
  const body = {
    board_id: input.boardId,
    title: input.title,
    description: input.description
  };

  if (input.boardSectionId) {
    body.board_section_id = input.boardSectionId;
  }

  if (input.link) {
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
