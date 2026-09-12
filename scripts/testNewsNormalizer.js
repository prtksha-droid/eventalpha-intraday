import { normalizeNewsItem } from "../src/services/news/newsNormalizer.service.js";

const input = {
  source: "TEST_SOURCE",

  externalId: "abc-123",

  title: "   Tata Motors   announces   new EV platform   ",

  description:
    "Tata Motors announces a new electric vehicle platform.",

  content:
    "The company said the platform will support future electric vehicles.",

  publishedAt: new Date(),

  language: "en",
};

const normalized = normalizeNewsItem(input);

console.log(
  JSON.stringify(normalized, null, 2)
);