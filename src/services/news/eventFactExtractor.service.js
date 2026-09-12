function normalize(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function extractByPatterns(text, patterns = []) {
  const results = [];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      results.push(
        normalize(match[0])
      );
    }
  }

  return unique(results);
}

export function extractEventFacts(text = "") {
  const normalizedText =
    normalize(text);

  if (!normalizedText) {
    return {
      monetaryValues: [],
      percentages: [],
      quantities: [],
      dates: [],
      durations: [],
    };
  }

  const monetaryValues =
    extractByPatterns(
      normalizedText,
      [
        /(?:₹|rs\.?|inr)\s*[\d,.]+(?:\s*(?:crore|cr|lakh|million|billion|trillion))?/gi,

        /\b[\d,.]+\s*(?:crore|lakh|million|billion|trillion)\s*(?:rupees?|inr)?\b/gi,

        /(?:\$|usd)\s*[\d,.]+(?:\s*(?:million|billion|trillion))?/gi,
      ]
    );

  const percentages =
    extractByPatterns(
      normalizedText,
      [
        /\b\d+(?:\.\d+)?\s*%/g,
      ]
    );

  const durations =
    extractByPatterns(
      normalizedText,
      [
        /\b\d+(?:\.\d+)?\s*(?:day|days|week|weeks|month|months|year|years)\b/gi,
      ]
    );

  const dates =
    extractByPatterns(
      normalizedText,
      [
        /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,

        /\b\d{4}-\d{2}-\d{2}\b/g,
      ]
    );

  return {
    monetaryValues,
    percentages,
    dates,
    durations,
  };
}