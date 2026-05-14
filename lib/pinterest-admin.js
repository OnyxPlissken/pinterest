import {
  createPinterestBoard,
  createPinterestBoardSection,
  deletePinterestPin,
  listPinterestBoardPins,
  listPinterestBoards,
  listPinterestBoardSectionPins,
  listPinterestBoardSections,
  updatePinterestBoard,
  updatePinterestBoardSection,
  updatePinterestPin
} from "./pinterest-api";

function getImageUrl(pin) {
  const images = pin?.media?.images || pin?.media?.image || {};
  const candidates = [
    images["1200x"]?.url,
    images["600x"]?.url,
    images["400x300"]?.url,
    images["150x150"]?.url,
    pin?.media?.url,
    pin?.media_source?.url
  ];

  return candidates.find(Boolean) || "";
}

function normalizePrivacy(value) {
  if (!value || typeof value === "string") {
    return value || "";
  }

  return value.privacy || value.type || value.name || value.value || "";
}

function normalizeBoard(board) {
  const privacy = normalizePrivacy(board.privacy);

  return {
    id: board.id,
    name: board.name,
    description: board.description || "",
    privacy,
    pinCount: board.pin_count ?? board.counts?.pins ?? null,
    url: board.url || "",
    createdAt: board.created_at || ""
  };
}

function normalizeSection(section, board) {
  return {
    id: section.id,
    name: section.name,
    boardId: board.id,
    boardName: board.name,
    boardPrivacy: board.privacy || "",
    pinCount: section.pin_count ?? section.counts?.pins ?? null
  };
}

function normalizePin(pin, board, section = null) {
  const privacy = normalizePrivacy(pin.privacy || board.privacy);

  return {
    id: pin.id,
    title: pin.title || "",
    description: pin.description || "",
    link: pin.link || "",
    url: pin.url || "",
    imageUrl: getImageUrl(pin),
    boardId: pin.board_id || board.id,
    boardName: board.name,
    boardPrivacy: board.privacy || "",
    boardSectionId: pin.board_section_id || section?.id || "",
    sectionName: section?.name || "",
    privacy,
    createdAt: pin.created_at || "",
    isOwner: pin.is_owner ?? null
  };
}

function normalizeBoardPrivacyInput(value) {
  const normalizedPrivacy = String(value || "").toUpperCase();
  if (!["PUBLIC", "SECRET", "PROTECTED"].includes(normalizedPrivacy)) {
    throw new Error("Privacy bacheca non valida.");
  }

  return normalizedPrivacy;
}

function normalizePinPrivacyInput(value) {
  const normalizedPrivacy = String(value || "PUBLIC").toUpperCase();
  if (normalizedPrivacy === "SECRET") {
    return "PROTECTED";
  }

  if (!["PUBLIC", "PROTECTED"].includes(normalizedPrivacy)) {
    throw new Error("Privacy Pin non valida.");
  }

  return normalizedPrivacy;
}

export async function getPinterestAdminTree(config) {
  const boards = (await listPinterestBoards(config)).map(normalizeBoard);
  const sectionsByBoard = {};

  for (const board of boards) {
    sectionsByBoard[board.id] = (await listPinterestBoardSections(config, board.id)).map(
      (section) => normalizeSection(section, board)
    );
  }

  return {
    boards,
    sectionsByBoard
  };
}

export async function getPinterestAdminPins(config, { boardId, sectionId = "" }) {
  const boards = (await listPinterestBoards(config)).map(normalizeBoard);
  const board = boards.find((entry) => entry.id === boardId);

  if (!board) {
    throw new Error("Bacheca Pinterest non trovata.");
  }

  const sections = (await listPinterestBoardSections(config, board.id)).map((section) =>
    normalizeSection(section, board)
  );
  const section = sectionId ? sections.find((entry) => entry.id === sectionId) : null;

  if (sectionId && !section) {
    throw new Error("Sezione Pinterest non trovata.");
  }

  const rawPins = section
    ? await listPinterestBoardSectionPins(config, board.id, section.id)
    : await listPinterestBoardPins(config, board.id);

  return {
    board,
    section,
    sections,
    pins: rawPins.map((pin) => normalizePin(pin, board, section))
  };
}

export async function updatePinterestAdminPin(
  config,
  { pinId, boardId, sectionId = "", title, description, link, privacy }
) {
  if (!pinId) {
    throw new Error("Seleziona un Pin da modificare.");
  }

  if (!boardId) {
    throw new Error("Bacheca Pin mancante.");
  }

  await updatePinterestPin(config, pinId, {
    boardId,
    boardSectionId: sectionId,
    title: String(title ?? ""),
    description: String(description ?? ""),
    link: String(link ?? ""),
    privacy: normalizePinPrivacyInput(privacy)
  });

  return {
    pinId,
    status: "ok"
  };
}

export async function updatePinterestAdminBoard(config, input) {
  const source = input || {};
  const { boardId } = source;

  if (!boardId) {
    throw new Error("Seleziona una bacheca da modificare.");
  }

  const payload = {};

  if (Object.prototype.hasOwnProperty.call(source, "name")) {
    const boardName = String(source.name ?? "").trim();
    if (!boardName) {
      throw new Error("Inserisci il nome della bacheca.");
    }
    payload.name = boardName;
  }

  if (Object.prototype.hasOwnProperty.call(source, "privacy")) {
    payload.privacy = normalizeBoardPrivacyInput(source.privacy);
  }

  await updatePinterestBoard(config, boardId, payload);

  return {
    boardId,
    ...payload,
    status: "ok"
  };
}

export async function updatePinterestAdminBoardPrivacy(config, { boardId, privacy }) {
  return updatePinterestAdminBoard(config, { boardId, privacy });
}

export async function updatePinterestAdminSection(config, { boardId, sectionId, name }) {
  if (!boardId) {
    throw new Error("Seleziona la bacheca della sezione.");
  }

  if (!sectionId) {
    throw new Error("Seleziona una sezione da modificare.");
  }

  const sectionName = String(name ?? "").trim();
  if (!sectionName) {
    throw new Error("Inserisci il nome della sezione.");
  }

  await updatePinterestBoardSection(config, boardId, sectionId, {
    name: sectionName
  });

  return {
    boardId,
    sectionId,
    name: sectionName,
    status: "ok"
  };
}

export async function createPinterestAdminBoard(config, { name, privacy = "SECRET" }) {
  const boardName = String(name || "").trim();
  if (!boardName) {
    throw new Error("Inserisci il nome della bacheca.");
  }

  const normalizedPrivacy = normalizeBoardPrivacyInput(privacy || "SECRET");

  const board = await createPinterestBoard(config, boardName, {
    privacy: normalizedPrivacy
  });

  return {
    board: normalizeBoard(board),
    status: "ok"
  };
}

export async function createPinterestAdminSection(config, { boardId, name }) {
  const sectionName = String(name || "").trim();
  if (!boardId) {
    throw new Error("Seleziona la bacheca in cui creare la sezione.");
  }
  if (!sectionName) {
    throw new Error("Inserisci il nome della sezione.");
  }

  const boards = (await listPinterestBoards(config)).map(normalizeBoard);
  const board = boards.find((entry) => entry.id === boardId);
  if (!board) {
    throw new Error("Bacheca Pinterest non trovata.");
  }

  const section = await createPinterestBoardSection(config, boardId, sectionName);

  return {
    section: normalizeSection(section, board),
    status: "ok"
  };
}

export async function deletePinterestAdminPins(config, { pinIds }) {
  const ids = Array.from(new Set((pinIds || []).map(String).filter(Boolean)));

  if (!ids.length) {
    throw new Error("Seleziona almeno un Pin da eliminare.");
  }

  const results = [];
  for (const pinId of ids) {
    try {
      await deletePinterestPin(config, pinId);
      results.push({ pinId, status: "ok" });
    } catch (error) {
      results.push({
        pinId,
        status: "error",
        error: error instanceof Error ? error.message : "Errore eliminazione Pin."
      });
    }
  }

  return {
    ok: results.filter((result) => result.status === "ok").length,
    failed: results.filter((result) => result.status === "error").length,
    results
  };
}

export async function bulkUpdatePinterestAdminPins(config, { updates }) {
  const entries = Array.isArray(updates) ? updates : [];

  if (!entries.length) {
    throw new Error("Seleziona almeno un Pin da modificare.");
  }

  const results = [];
  for (const entry of entries) {
    try {
      await updatePinterestAdminPin(config, {
        pinId: entry.pinId,
        boardId: entry.boardId,
        sectionId: entry.sectionId || "",
        title: entry.title,
        description: entry.description,
        link: entry.link,
        privacy: entry.privacy
      });
      results.push({ pinId: entry.pinId, status: "ok" });
    } catch (error) {
      results.push({
        pinId: entry.pinId,
        status: "error",
        error: error instanceof Error ? error.message : "Errore modifica Pin."
      });
    }
  }

  return {
    ok: results.filter((result) => result.status === "ok").length,
    failed: results.filter((result) => result.status === "error").length,
    results
  };
}
