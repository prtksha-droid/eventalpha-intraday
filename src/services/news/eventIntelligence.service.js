import RawNews from "../../models/RawNews.js";
import NewsEvent from "../../models/NewsEvent.js";
import {
  extractEventFacts,
} from "./eventFactExtractor.service.js";

import {
  classifyEventText,
} from "./eventClassifier.service.js";


function buildEventText(newsDocuments) {
  return newsDocuments
    .map((news) =>
      [
        news.title,
        news.description,
        news.content,
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");
}

function selectPrimaryCandidate(
  candidates = []
) {
  if (!candidates.length) {
    return null;
  }

  return [...candidates].sort(
    (a, b) => {
      if (
        b.matchedPhrases.length !==
        a.matchedPhrases.length
      ) {
        return (
          b.matchedPhrases.length -
          a.matchedPhrases.length
        );
      }

      if (
        b.matchedKeywords.length !==
        a.matchedKeywords.length
      ) {
        return (
          b.matchedKeywords.length -
          a.matchedKeywords.length
        );
      }

      return (
        (b.priority || 0) -
        (a.priority || 0)
      );
    }
  )[0];
}

export async function enrichEventIntelligence(
  eventId
) {
  const event =
    await NewsEvent.findById(eventId);

  if (!event) {
    throw new Error(
      `NewsEvent not found: ${eventId}`
    );
  }

  const newsDocuments =
    await RawNews.find({
      _id: {
        $in: event.sourceNewsIds,
      },
    }).lean();

  if (!newsDocuments.length) {
    throw new Error(
      `No RawNews documents for event ${eventId}`
    );
  }

  const text =
    buildEventText(
      newsDocuments
    );
  const facts =
    extractEventFacts(text);
  const classification =
    await classifyEventText(text);

  const primary =
    selectPrimaryCandidate(
      classification.candidates
    );


  event.eventType =
    primary?.code || null;

  event.eventSubtype =
    primary?.parentCode || null;

  event.themes =
    primary?.themes || [];

  event.metadata = {
    ...(event.metadata || {}),

    classification: {
      matched:
        classification.matched,

      candidates:
        classification.candidates,

      selected:
        primary,
    },
    facts,
  };

  await event.save();

  return {
      event,
      classification,
      selectedEventType: primary,
      facts,
    };
}