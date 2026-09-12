import NewsEvent from "../../models/NewsEvent.js";
import EventCompanyImpact from "../../models/EventCompanyImpact.js";

function buildImpactEvidence({
  event,
  impact,
}) {
  const evidence = [];

  const selectedClassification =
    event.metadata
      ?.classification
      ?.selected;

  if (selectedClassification) {
    evidence.push({
      type: "EVENT_CLASSIFICATION",

      eventType:
        selectedClassification.code,

      eventName:
        selectedClassification.name,

      parentCode:
        selectedClassification.parentCode,

      matchedKeywords:
        selectedClassification
          .matchedKeywords || [],

      matchedPhrases:
        selectedClassification
          .matchedPhrases || [],
    });
  }

  if (impact.relationshipType) {
    evidence.push({
      type: "COMPANY_RELATIONSHIP",

      relationshipType:
        impact.relationshipType,

      companyId:
        impact.companyId,

      symbol:
        impact.symbol,

      exchange:
        impact.exchange,
    });
  }

  const facts =
    event.metadata?.facts;

  if (facts) {
    evidence.push({
      type: "EVENT_FACTS",
      ...facts,
    });
  }

  return evidence;
}

export async function buildEventImpacts(
  eventId
) {
  const event =
    await NewsEvent.findById(eventId);

  if (!event) {
    throw new Error(
      `NewsEvent not found: ${eventId}`
    );
  }

  const impacts =
    await EventCompanyImpact.find({
      eventId: event._id,
    });

  if (!impacts.length) {
    return {
      event,
      impacts: [],
    };
  }

  const updatedImpacts = [];

  for (const impact of impacts) {
    const intelligenceEvidence =
      buildImpactEvidence({
        event,
        impact,
      });

    const existingEvidence =
      Array.isArray(impact.evidence)
        ? impact.evidence
        : [];

    const resolutionEvidence =
      existingEvidence.filter(
        (item) =>
          item?.type ===
          "DIRECT_TEXT_MATCH"
      );

    impact.evidence = [
      ...resolutionEvidence,
      ...intelligenceEvidence,
    ];

    impact.metadata = {
      ...(impact.metadata || {}),

      eventIntelligence: {
        eventType:
          event.eventType,

        eventSubtype:
          event.eventSubtype,

        themes:
          event.themes || [],

        facts:
          event.metadata
            ?.facts || {},
      },

      impactStatus:
        "AWAITING_EVIDENCE",
    };

    /*
     * Do NOT populate these yet.
     *
     * impact.direction
     * impact.impactStrength
     * impact.confidence
     * impact.relevance
     * impact.expectedHorizon
     *
     * They require market/historical
     * evidence.
     */

    await impact.save();

    updatedImpacts.push(
      impact
    );
  }

  return {
    event,
    impacts:
      updatedImpacts,
  };
}