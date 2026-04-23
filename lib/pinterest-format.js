function toTitleCase(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatLookLabel(lookNumber) {
  return `Look ${lookNumber}`;
}

export function formatSeasonLabel(rawSeason) {
  const compactSeason = String(rawSeason).replace(/[^a-z0-9]/gi, "").toUpperCase();
  const match = compactSeason.match(/^(SS|FW)(\d{2,4})$/);

  if (!match) {
    return rawSeason;
  }

  return `${match[1] === "SS" ? "Spring Summer" : "Fall Winter"} ${match[2]}`;
}

export function formatAssetTypeLabel(rawAssetType) {
  return toTitleCase(String(rawAssetType).replace(/[_-]+/g, " "));
}

export function buildRulePreview({
  titlePrefix = "",
  descriptionPrefix = "",
  season = "SS26",
  collection = "ISAIA Contemporanea",
  assetType = "Lookbook",
  lookNumber = 1
} = {}) {
  const assetTypeLabel = formatAssetTypeLabel(assetType);

  return {
    title: `${String(titlePrefix || "").trim()} ${season} ${assetTypeLabel}`.trim(),
    description: [
      `${String(descriptionPrefix || "").trim()} ${formatSeasonLabel(season)}`.trim(),
      collection,
      assetTypeLabel,
      formatLookLabel(lookNumber)
    ].join(" | "),
    section: assetTypeLabel
  };
}
