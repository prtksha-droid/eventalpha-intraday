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

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(
      normalizedTerm
    )}(?=$|[^a-z0-9])`,
    "i"
  );

  return pattern.test(text);
}

function collectMatches(text, terms = []) {
  return terms.filter((term) =>
    containsTerm(text, term)
  );
}

export async function classifyEventText(text) {
  const normalizedText = normalize(text);

  if (!normalizedText) {
    return {
      matched: false,
      candidates: [],
    };
  }

  const taxonomy =
    await EventTaxonomy.find({
      isActive: true,
    })
      .sort({
        priority: -1,
      })
      .lean();

  const candidates = [];

  for (const definition of taxonomy) {
    const matchedKeywords =
      collectMatches(
        normalizedText,
        definition.keywords
      );

    const matchedPhrases =
      collectMatches(
        normalizedText,
        definition.phrases
      );

    if (
      !matchedKeywords.length &&
      !matchedPhrases.length
    ) {
      continue;
    }

    candidates.push({
      code: definition.code,

      name: definition.name,

      parentCode:
        definition.parentCode,

      matchedKeywords,

      matchedPhrases,

      themes:
        definition.themes || [],

      defaultHorizon:
        definition.defaultHorizon,

      priority:
        definition.priority,

      metadata:
        definition.metadata,
    });
  }

  return {
    matched:
      candidates.length > 0,

    candidates,
  };
}