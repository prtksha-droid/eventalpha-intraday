import RawNews from "../../models/RawNews.js";
import NewsEvent from "../../models/NewsEvent.js";

import {
  extractEventFromNews,
} from "./eventExtraction.service.js";

export async function processRawNewsEvent(rawNewsId) {
  const rawNews = await RawNews.findById(rawNewsId);

  if (!rawNews) {
    throw new Error(
      `RawNews not found: ${rawNewsId}`
    );
  }

  const extracted =
    await extractEventFromNews(rawNews);

  const existing = await NewsEvent.findOne({
    eventKey: extracted.eventKey,
  });

  if (existing) {
    return {
      created: false,
      duplicate: true,
      event: existing,
    };
  }

  const event = await NewsEvent.create(
    extracted
  );

  rawNews.processingStatus = "PROCESSED";
  rawNews.processingError = undefined;

  await rawNews.save();

  return {
    created: true,
    duplicate: false,
    event,
  };
}