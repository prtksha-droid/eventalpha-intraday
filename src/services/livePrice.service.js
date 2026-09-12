import {
  getRedisClient
} from "../config/redis.js";

function toNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export async function getLivePrice({
  exchange,
  tradingSymbol
}) {
  if (!exchange) {
    throw new Error(
      "exchange is required"
    );
  }

  if (!tradingSymbol) {
    throw new Error(
      "tradingSymbol is required"
    );
  }

  const normalizedExchange =
    exchange.toUpperCase();

  const normalizedTradingSymbol =
    tradingSymbol.toUpperCase();

  const redis =
    getRedisClient();

  const key = [
    "market",
    "ltp",
    normalizedExchange,
    normalizedTradingSymbol
  ].join(":");

  const raw =
    await redis.get(key);

  if (!raw) {
    return {
      available: false,
      exchange:
        normalizedExchange,
      tradingSymbol:
        normalizedTradingSymbol,
      reason:
        "LIVE_PRICE_NOT_AVAILABLE"
    };
  }

  let payload;

  try {
    payload =
      JSON.parse(raw);
  } catch {
    return {
      available: false,
      exchange:
        normalizedExchange,
      tradingSymbol:
        normalizedTradingSymbol,
      reason:
        "INVALID_LIVE_PRICE_PAYLOAD"
    };
  }

  const price =
    toNumber(payload.ltp);

  const timestamp =
    toNumber(payload.timestamp);

  if (
    price === null ||
    price <= 0
  ) {
    return {
      available: false,
      exchange:
        normalizedExchange,
      tradingSymbol:
        normalizedTradingSymbol,
      reason:
        "INVALID_LIVE_PRICE"
    };
  }

  const ageSeconds =
    timestamp !== null
      ? Math.max(
          0,
          (Date.now() - timestamp) /
            1000
        )
      : null;

  return {
    available: true,

    exchange:
      normalizedExchange,

    tradingSymbol:
      normalizedTradingSymbol,

    isin:
      payload.isin || null,

    exchangeToken:
      payload.exchangeToken || null,

    price,

    timestamp,

    ageSeconds,

    source:
      payload.source || null
  };
}