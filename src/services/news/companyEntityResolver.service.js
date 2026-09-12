import { Company } from "../../models/Company.js";

function normalize(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createAliasPattern(alias) {
  const escaped = escapeRegex(alias);

  return new RegExp(
    `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
    "i"
  );
}

function getCompanyAliases(company) {
  const aliases = new Set();

  if (company.name) {
    aliases.add(company.name);
  }

  for (const alias of company.aliases || []) {
    if (alias) {
      aliases.add(alias);
    }
  }

  for (const listing of company.listings || []) {
    if (listing.tradingSymbol) {
      aliases.add(listing.tradingSymbol);
    }
  }

  return [...aliases];
}

export async function resolveCompaniesFromText(text) {
  const searchableText = normalize(text);

  if (!searchableText) {
    return [];
  }

  const companies = await Company.find({
    isActive: true,
  }).lean();

  const matches = [];

  for (const company of companies) {
    const aliases = getCompanyAliases(company);

    const aliasMatches = [];

    for (const alias of aliases) {
      const normalizedAlias = normalize(alias);

      if (!normalizedAlias) {
        continue;
      }

      const pattern = createAliasPattern(normalizedAlias);

      if (pattern.test(searchableText)) {
        aliasMatches.push(alias);
      }
    }

    if (!aliasMatches.length) {
      continue;
    }

    aliasMatches.sort(
      (a, b) => b.length - a.length
    );

    matches.push({
      companyId: company._id,

      isin: company.isin,

      name: company.name,

      matchedAlias: aliasMatches[0],

      matchedAliases: aliasMatches,

      sector: company.sector,

      industry: company.industry,

      classification: company.classification,

      intradayEligible:
        company.intradayEligible,

      listings: company.listings || [],

      resolutionMethod:
        "COMPANY_MASTER_ALIAS",
    });
  }

  return matches;
}