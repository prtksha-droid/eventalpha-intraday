import crypto from "crypto";

import {
  getRedisClient
} from "../config/redis.js";

import {
  getLoginRateLimitConfig
} from "../config/authRateLimit.js";

const config =
  getLoginRateLimitConfig();

const LOGIN_RATE_LIMIT_PREFIX =
  "auth:rate-limit:login";

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])

if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end

local ttl = redis.call("TTL", KEYS[1])

return { current, ttl }
`;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return String(value || "");
}

function getClientIp(req) {
  const cloudflareIp =
    getHeaderValue(
      req.headers["cf-connecting-ip"]
    ).trim();

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor =
    getHeaderValue(
      req.headers["x-forwarded-for"]
    );

  const forwardedIp =
    forwardedFor
      .split(",")[0]
      .trim();

  if (forwardedIp) {
    return forwardedIp;
  }

  return (
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function buildRateLimitKey(
  email,
  clientIp
) {
  const normalizedEmail =
    normalizeEmail(email);

  const identityHash =
    crypto
      .createHash("sha256")
      .update(
        `${normalizedEmail}|${clientIp}`
      )
      .digest("hex");

  return (
    `${LOGIN_RATE_LIMIT_PREFIX}:` +
    identityHash
  );
}

export async function loginRateLimit(
  req,
  res,
  next
) {
  try {
    const redis =
      getRedisClient();

    const clientIp =
      getClientIp(req);

    const key =
      buildRateLimitKey(
        req.body?.email,
        clientIp
      );

    const result =
      await redis.eval(
        RATE_LIMIT_SCRIPT,
        {
          keys: [key],
          arguments: [
            String(
              config.windowSeconds
            )
          ]
        }
      );

    const attemptCount =
      Number(result[0]);

    const ttl =
      Math.max(
        Number(result[1]),
        0
      );

    const remaining =
      Math.max(
        config.maxAttempts -
          attemptCount,
        0
      );

    res.set(
      "RateLimit-Limit",
      String(
        config.maxAttempts
      )
    );

    res.set(
      "RateLimit-Remaining",
      String(remaining)
    );

    if (
      attemptCount >
      config.maxAttempts
    ) {
      res.set(
        "Retry-After",
        String(ttl)
      );

      return res
        .status(429)
        .json({
          success: false,
          error:
            "Too many login attempts. Please try again later."
        });
    }

    return next();
  } catch (error) {
    console.error(
      "Login rate limiter failed:",
      error
    );

    return res
      .status(503)
      .json({
        success: false,
        error:
          "Authentication is temporarily unavailable"
      });
  }
}