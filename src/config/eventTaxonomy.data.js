export const eventTaxonomyData = [
  // --------------------------------------------------
  // CORPORATE / FINANCIAL
  // --------------------------------------------------

  {
    code: "EARNINGS",
    name: "Earnings / Financial Results",
    parentCode: "CORPORATE",
    keywords: [
      "earnings",
      "profit",
      "profits",
      "revenue",
      "ebitda",
      "ebit",
      "net income",
      "net profit",
      "quarterly results",
      "financial results",
    ],
    phrases: [
      "reports earnings",
      "reports profit",
      "reports revenue",
      "announces financial results",
      "quarterly results",
    ],
    themes: ["FINANCIAL_PERFORMANCE"],
    priority: 100,
    isActive: true,
  },

  {
    code: "GUIDANCE",
    name: "Management Guidance / Outlook",
    parentCode: "CORPORATE",
    keywords: [
      "guidance",
      "outlook",
      "forecast",
      "projection",
    ],
    phrases: [
      "raises guidance",
      "cuts guidance",
      "revises guidance",
      "revenue guidance",
      "earnings guidance",
    ],
    themes: ["FORWARD_OUTLOOK"],
    priority: 95,
    isActive: true,
  },

  {
    code: "ORDER_CONTRACT",
    name: "Order / Contract",
    parentCode: "CORPORATE",
    keywords: [
      "contract",
      "order",
      "deal",
    ],
    phrases: [
      "wins order",
      "wins contract",
      "receives order",
      "awarded contract",
      "awarded order",
      "secures contract",
      "secures order",
    ],
    themes: ["BUSINESS_WIN"],
    priority: 90,
    isActive: true,
  },

  {
    code: "INVESTMENT_CAPEX",
    name: "Investment / Capital Expenditure",
    parentCode: "CORPORATE",
    keywords: [
      "investment",
      "capex",
      "capital expenditure",
    ],
    phrases: [
      "announces investment",
      "plans investment",
      "capital expenditure",
      "investment programme",
      "investment program",
      "investment plan",
      "capex plan",
    ],
    themes: ["INVESTMENT", "CAPACITY"],
    priority: 90,
    isActive: true,
  },

  {
    code: "MERGER_ACQUISITION",
    name: "Merger / Acquisition",
    parentCode: "CORPORATE",
    keywords: [
      "acquisition",
      "merger",
      "takeover",
      "acquire",
    ],
    phrases: [
      "to acquire",
      "acquires stake",
      "acquires company",
      "merger agreement",
      "acquisition agreement",
    ],
    themes: ["M&A"],
    priority: 100,
    isActive: true,
  },

  {
    code: "FUNDRAISING",
    name: "Fundraising / Capital Raising",
    parentCode: "CORPORATE",
    keywords: [
      "fundraising",
      "fund raising",
      "rights issue",
      "qip",
      "qualified institutional placement",
    ],
    phrases: [
      "raise funds",
      "raising funds",
      "raise capital",
      "raising capital",
      "rights issue",
    ],
    themes: ["CAPITAL"],
    priority: 90,
    isActive: true,
  },

  {
    code: "DIVIDEND",
    name: "Dividend",
    parentCode: "CORPORATE",
    keywords: ["dividend"],
    phrases: [
      "declares dividend",
      "announces dividend",
      "interim dividend",
      "final dividend",
      "special dividend",
    ],
    themes: ["CORPORATE_ACTION"],
    priority: 85,
    isActive: true,
  },

  {
    code: "BUYBACK",
    name: "Share Buyback",
    parentCode: "CORPORATE",
    keywords: ["buyback"],
    phrases: [
      "share buyback",
      "stock buyback",
      "buyback of shares",
    ],
    themes: ["CORPORATE_ACTION"],
    priority: 90,
    isActive: true,
  },

  {
    code: "STOCK_SPLIT",
    name: "Stock Split",
    parentCode: "CORPORATE",
    keywords: ["stock split"],
    phrases: [
      "share split",
      "stock split",
      "subdivision of shares",
    ],
    themes: ["CORPORATE_ACTION"],
    priority: 90,
    isActive: true,
  },

  {
    code: "MANAGEMENT_CHANGE",
    name: "Management Change",
    parentCode: "CORPORATE",
    keywords: [
      "ceo",
      "cfo",
      "chairman",
      "managing director",
      "resignation",
      "appointment",
    ],
    phrases: [
      "appoints ceo",
      "appoints cfo",
      "ceo resigns",
      "cfo resigns",
      "managing director resigns",
      "appoints managing director",
    ],
    themes: ["MANAGEMENT"],
    priority: 80,
    isActive: true,
  },

  {
    code: "PRODUCT_LAUNCH",
    name: "Product / Service Launch",
    parentCode: "CORPORATE",
    keywords: [
      "launch",
      "product launch",
      "new product",
    ],
    phrases: [
      "launches new",
      "unveils new",
      "introduces new",
      "product launch",
    ],
    themes: ["PRODUCT"],
    priority: 75,
    isActive: true,
  },

  {
    code: "EXPANSION",
    name: "Business / Capacity Expansion",
    parentCode: "CORPORATE",
    keywords: [
      "expansion",
      "capacity expansion",
      "new plant",
      "new facility",
    ],
    phrases: [
      "expands capacity",
      "capacity expansion",
      "opens new plant",
      "sets up new plant",
      "new manufacturing facility",
    ],
    themes: ["CAPACITY", "EXPANSION"],
    priority: 80,
    isActive: true,
  },

  {
    code: "PARTNERSHIP",
    name: "Partnership / Strategic Alliance",
    parentCode: "CORPORATE",
    keywords: [
      "partnership",
      "alliance",
      "collaboration",
    ],
    phrases: [
      "strategic partnership",
      "strategic alliance",
      "enters partnership",
      "signs partnership",
      "collaboration agreement",
    ],
    themes: ["PARTNERSHIP"],
    priority: 75,
    isActive: true,
  },

  {
    code: "RESTRUCTURING",
    name: "Corporate Restructuring",
    parentCode: "CORPORATE",
    keywords: [
      "restructuring",
      "demerger",
      "spin-off",
      "spinoff",
    ],
    phrases: [
      "corporate restructuring",
      "business restructuring",
      "announces demerger",
    ],
    themes: ["RESTRUCTURING"],
    priority: 85,
    isActive: true,
  },

  // --------------------------------------------------
  // REGULATORY
  // --------------------------------------------------

  {
    code: "REGULATORY_APPROVAL",
    name: "Regulatory Approval",
    parentCode: "REGULATORY",
    keywords: [
      "approval",
      "approved",
      "clearance",
    ],
    phrases: [
      "regulatory approval",
      "receives approval",
      "gets approval",
      "receives clearance",
    ],
    themes: ["REGULATORY"],
    priority: 90,
    isActive: true,
  },

  {
    code: "REGULATORY_PENALTY",
    name: "Regulatory Penalty",
    parentCode: "REGULATORY",
    keywords: [
      "penalty",
      "fine",
      "fined",
    ],
    phrases: [
      "imposes penalty",
      "imposed penalty",
      "regulatory fine",
    ],
    themes: ["REGULATORY"],
    priority: 95,
    isActive: true,
  },

  {
    code: "REGULATORY_INVESTIGATION",
    name: "Regulatory Investigation",
    parentCode: "REGULATORY",
    keywords: [
      "investigation",
      "probe",
      "inquiry",
    ],
    phrases: [
      "regulatory investigation",
      "launches probe",
      "under investigation",
    ],
    themes: ["REGULATORY"],
    priority: 95,
    isActive: true,
  },

  {
    code: "LICENSE",
    name: "License / Permit",
    parentCode: "REGULATORY",
    keywords: [
      "license",
      "licence",
      "permit",
    ],
    phrases: [
      "receives license",
      "license revoked",
      "license suspended",
      "granted license",
    ],
    themes: ["REGULATORY"],
    priority: 85,
    isActive: true,
  },

  // --------------------------------------------------
  // LEGAL
  // --------------------------------------------------

  {
    code: "LITIGATION",
    name: "Litigation / Legal Action",
    parentCode: "LEGAL",
    keywords: [
      "lawsuit",
      "litigation",
      "legal action",
    ],
    phrases: [
      "files lawsuit",
      "legal proceedings",
      "faces lawsuit",
    ],
    themes: ["LEGAL"],
    priority: 90,
    isActive: true,
  },

  {
    code: "COURT_RULING",
    name: "Court / Tribunal Ruling",
    parentCode: "LEGAL",
    keywords: [
      "court",
      "tribunal",
      "judgment",
      "judgement",
      "ruling",
    ],
    phrases: [
      "court rules",
      "court orders",
      "tribunal orders",
      "court ruling",
    ],
    themes: ["LEGAL"],
    priority: 90,
    isActive: true,
  },

  {
    code: "LEGAL_SETTLEMENT",
    name: "Legal Settlement",
    parentCode: "LEGAL",
    keywords: ["settlement"],
    phrases: [
      "legal settlement",
      "settles lawsuit",
      "settlement agreement",
    ],
    themes: ["LEGAL"],
    priority: 85,
    isActive: true,
  },

  // --------------------------------------------------
  // OPERATIONS
  // --------------------------------------------------

  {
    code: "PRODUCTION_CHANGE",
    name: "Production Change",
    parentCode: "OPERATIONS",
    keywords: [
      "production",
      "output",
    ],
    phrases: [
      "production rises",
      "production falls",
      "production increases",
      "production declines",
    ],
    themes: ["OPERATIONS"],
    priority: 75,
    isActive: true,
  },

  {
    code: "PLANT_SHUTDOWN",
    name: "Plant / Facility Shutdown",
    parentCode: "OPERATIONS",
    keywords: [
      "shutdown",
      "closure",
    ],
    phrases: [
      "plant shutdown",
      "plant closure",
      "factory shutdown",
      "operations suspended",
    ],
    themes: ["OPERATIONS"],
    priority: 95,
    isActive: true,
  },

  {
    code: "SUPPLY_DISRUPTION",
    name: "Supply Chain Disruption",
    parentCode: "OPERATIONS",
    keywords: [
      "shortage",
      "disruption",
      "supply chain",
    ],
    phrases: [
      "supply disruption",
      "supply shortage",
      "supply chain disruption",
    ],
    themes: ["SUPPLY_CHAIN"],
    priority: 90,
    isActive: true,
  },

  {
    code: "ACCIDENT_INCIDENT",
    name: "Accident / Operational Incident",
    parentCode: "OPERATIONS",
    keywords: [
      "accident",
      "fire",
      "explosion",
      "incident",
    ],
    phrases: [
      "factory fire",
      "plant fire",
      "industrial accident",
      "plant explosion",
    ],
    themes: ["OPERATIONS", "RISK"],
    priority: 100,
    isActive: true,
  },

  // --------------------------------------------------
  // GOVERNMENT / POLICY
  // --------------------------------------------------

  {
    code: "GOVERNMENT_POLICY",
    name: "Government Policy",
    parentCode: "GOVERNMENT",
    keywords: [
      "policy",
      "government policy",
    ],
    phrases: [
      "government announces",
      "government approves",
      "new policy",
    ],
    themes: ["POLICY"],
    priority: 80,
    isActive: true,
  },

  {
    code: "SUBSIDY_INCENTIVE",
    name: "Government Subsidy / Incentive",
    parentCode: "GOVERNMENT",
    keywords: [
      "subsidy",
      "incentive",
      "pli",
    ],
    phrases: [
      "government subsidy",
      "production linked incentive",
      "incentive scheme",
    ],
    themes: ["POLICY", "INCENTIVE"],
    priority: 85,
    isActive: true,
  },

  {
    code: "GOVERNMENT_TENDER",
    name: "Government Tender / Procurement",
    parentCode: "GOVERNMENT",
    keywords: [
      "tender",
      "procurement",
    ],
    phrases: [
      "government tender",
      "wins tender",
      "awarded tender",
    ],
    themes: ["GOVERNMENT_ORDER"],
    priority: 90,
    isActive: true,
  },

  // --------------------------------------------------
  // MACRO
  // --------------------------------------------------

  {
    code: "INTEREST_RATE",
    name: "Interest Rate / Monetary Policy",
    parentCode: "MACRO",
    keywords: [
      "interest rate",
      "repo rate",
      "monetary policy",
    ],
    phrases: [
      "raises interest rates",
      "cuts interest rates",
      "repo rate",
      "monetary policy committee",
    ],
    themes: ["MACRO", "MONETARY_POLICY"],
    priority: 90,
    isActive: true,
  },

  {
    code: "INFLATION",
    name: "Inflation",
    parentCode: "MACRO",
    keywords: [
      "inflation",
      "cpi",
      "wpi",
    ],
    phrases: [
      "consumer price inflation",
      "wholesale price inflation",
    ],
    themes: ["MACRO"],
    priority: 80,
    isActive: true,
  },

  {
    code: "GDP",
    name: "GDP / Economic Growth",
    parentCode: "MACRO",
    keywords: [
      "gdp",
      "economic growth",
    ],
    phrases: [
      "gross domestic product",
      "gdp growth",
      "economic growth",
    ],
    themes: ["MACRO"],
    priority: 80,
    isActive: true,
  },

  {
    code: "CURRENCY",
    name: "Currency / Foreign Exchange",
    parentCode: "MACRO",
    keywords: [
      "rupee",
      "currency",
      "forex",
    ],
    phrases: [
      "rupee falls",
      "rupee rises",
      "currency depreciation",
      "currency appreciation",
    ],
    themes: ["MACRO", "CURRENCY"],
    priority: 75,
    isActive: true,
  },

  {
    code: "TAX_POLICY",
    name: "Taxation Change",
    parentCode: "MACRO",
    keywords: [
      "tax",
      "gst",
      "duty",
      "tariff",
    ],
    phrases: [
      "tax increase",
      "tax cut",
      "gst rate",
      "import duty",
      "export duty",
    ],
    themes: ["MACRO", "TAXATION"],
    priority: 85,
    isActive: true,
  },

  // --------------------------------------------------
  // MARKET
  // --------------------------------------------------

  {
    code: "RATING_CHANGE",
    name: "Credit Rating Change",
    parentCode: "MARKET",
    keywords: [
      "rating",
      "upgrade",
      "downgrade",
    ],
    phrases: [
      "rating upgrade",
      "rating downgrade",
      "credit rating",
    ],
    themes: ["CREDIT"],
    priority: 85,
    isActive: true,
  },

  {
    code: "INDEX_CHANGE",
    name: "Index Inclusion / Exclusion",
    parentCode: "MARKET",
    keywords: [
      "index inclusion",
      "index exclusion",
      "index rebalance",
    ],
    phrases: [
      "added to index",
      "removed from index",
      "index inclusion",
      "index exclusion",
    ],
    themes: ["MARKET_STRUCTURE"],
    priority: 85,
    isActive: true,
  },

  {
    code: "COMMODITY_MOVE",
    name: "Commodity Price / Supply Event",
    parentCode: "MARKET",
    keywords: [
      "crude oil",
      "gold",
      "silver",
      "copper",
      "commodity",
    ],
    phrases: [
      "oil prices rise",
      "oil prices fall",
      "commodity prices rise",
      "commodity prices fall",
    ],
    themes: ["COMMODITY"],
    priority: 75,
    isActive: true,
  },
];