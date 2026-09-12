import EventTaxonomy from "../../models/EventTaxonomy.js";

function normalize(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegex(value = "") {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function containsTerm(text, term) {
  const normalizedTerm = normalize(term);

  if (!normalizedTerm) {
    return false;
  }

  const regex = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(
      normalizedTerm
    )}(?=$|[^a-z0-9])`,
    "i"
  );

  return regex.test(text);
}

function findMatches(text, terms = []) {
  return terms.filter((term) =>
    containsTerm(text, term)
  );
}

export async function analyzeEventDirection({
  text,
  eventType,
}) {
  if (!eventType) {
    return {
      direction: null,
      evidence: [],
    };
  }

  const taxonomy =
    await EventTaxonomy.findOne({
      code: eventType,
      isActive: true,
    }).lean();

  if (!taxonomy) {
    return {
      direction: null,
      evidence: [],
    };
  }

  const normalizedText = normalize(text);

  const positiveMatches =
    findMatches(
      normalizedText,
      taxonomy.positiveIndicators
    );

  const negativeMatches =
    findMatches(
      normalizedText,
      taxonomy.negativeIndicators
    );

  let direction = null;

  if (
    positiveMatches.length &&
    !negativeMatches.length
  ) {
    direction = "BULLISH";
  }

  if (
    negativeMatches.length &&
    !positiveMatches.length
  ) {
    direction = "BEARISH";
  }

  if (
    positiveMatches.length &&
    negativeMatches.length
  ) {
    direction = "MIXED";
  }

  return {
    direction,

    evidence: {
      positiveMatches,
      negativeMatches,
    },
  };
}