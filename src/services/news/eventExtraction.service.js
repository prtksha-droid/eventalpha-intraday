import crypto from "crypto";

function createEventKey({
  headline,
  publishedAt,
  sourceNewsId,
}) {
  const value = [
    headline || "",
    publishedAt
      ? new Date(publishedAt).toISOString()
      : "",
    sourceNewsId?.toString() || "",
  ]
    .join("|")
    .toLowerCase();

  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

export async function extractEventFromNews(rawNews) {
  if (!rawNews) {
    throw new Error("Raw news document is required");
  }

  if (!rawNews.title) {
    throw new Error("Raw news title is required");
  }

  const eventKey = createEventKey({
    headline: rawNews.title,
    publishedAt: rawNews.publishedAt,
    sourceNewsId: rawNews._id,
  });

  return {
    eventKey,

    headline: rawNews.title,

    summary:
      rawNews.description ||
      rawNews.content ||
      rawNews.title,

    occurredAt:
      rawNews.publishedAt,

    firstPublishedAt:
      rawNews.publishedAt,

    latestPublishedAt:
      rawNews.publishedAt,

    sourceNewsIds: [
      rawNews._id,
    ],

    entities: [],

    themes: [],

    geography: [],

    eventType: null,

    eventSubtype: null,

    direction: null,

    confidence: null,

    extractionMethod: "BASELINE",

    processingVersion: "v1",

    metadata: {},
  };
}