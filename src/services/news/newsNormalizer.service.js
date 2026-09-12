import crypto from "crypto";

function normalizeWhitespace(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value = "") {
  return normalizeWhitespace(value).normalize("NFKC");
}

function buildFingerprintText({
  title,
  description,
  content,
}) {
  return normalizeText(
    [title, description, content]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();
}

function createFingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

export function normalizeNewsItem(item = {}) {
  const title = normalizeText(item.title);
  const description = normalizeText(item.description);
  const content = normalizeText(item.content);

  const normalizedText = buildFingerprintText({
    title,
    description,
    content,
  });

  return {
    source: normalizeText(item.source),

    sourceType: item.sourceType
      ? normalizeText(item.sourceType)
      : undefined,

    externalId: item.externalId
      ? normalizeText(item.externalId)
      : undefined,

    url: item.url
      ? normalizeText(item.url)
      : undefined,

    title,

    description,

    content,

    author: item.author
      ? normalizeText(item.author)
      : undefined,

    publishedAt:
      item.publishedAt instanceof Date
        ? item.publishedAt
        : new Date(item.publishedAt),

    language: item.language
      ? normalizeText(item.language)
      : undefined,

    fingerprint: createFingerprint(normalizedText),

    normalizedText,

    metadata: item.metadata,
  };
}