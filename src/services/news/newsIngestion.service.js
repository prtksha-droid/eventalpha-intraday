import RawNews from "../../models/RawNews.js";
import { normalizeNewsItem } from "./newsNormalizer.service.js";

function validateNormalizedNews(item) {
  if (!item.source) {
    throw new Error("News source is required");
  }

  if (!item.title) {
    throw new Error("News title is required");
  }

  if (
    !item.publishedAt ||
    Number.isNaN(item.publishedAt.getTime())
  ) {
    throw new Error("Valid publishedAt is required");
  }

  if (!item.fingerprint) {
    throw new Error("News fingerprint is required");
  }
}

export async function ingestNewsItem(item) {
  const normalized = normalizeNewsItem(item);

  validateNormalizedNews(normalized);

  let existing = null;

  if (normalized.externalId) {
    existing = await RawNews.findOne({
      source: normalized.source,
      externalId: normalized.externalId,
    });
  }

  if (!existing) {
    existing = await RawNews.findOne({
      fingerprint: normalized.fingerprint,
    });
  }

  if (existing) {
    return {
      inserted: false,
      duplicate: true,
      document: existing,
    };
  }

  const document = await RawNews.create({
    ...normalized,
    receivedAt: new Date(),
    processingStatus: "PENDING",
  });

  return {
    inserted: true,
    duplicate: false,
    document,
  };
}

export async function ingestNewsBatch(items = []) {
  const results = [];

  for (const item of items) {
    try {
      const result = await ingestNewsItem(item);

      results.push({
        success: true,
        inserted: result.inserted,
        duplicate: result.duplicate,
        id: result.document._id,
        source: result.document.source,
        externalId: result.document.externalId,
      });
    } catch (error) {
      results.push({
        success: false,
        inserted: false,
        duplicate: false,
        error: error.message,
      });
    }
  }

  return results;
}