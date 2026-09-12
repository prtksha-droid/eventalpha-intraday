import "../models/Company.js";
import { UserCompany } from "../models/UserCompany.js";
import { Notification } from "../models/Notification.js";
import { getRedisClient } from "../config/redis.js";
import { getAlertConfig } from "../config/alerts.js";

function getNowEpochMilliseconds() {
  return Date.now();
}

function parsePricePayload(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function isPriceFresh({
  timestamp,
  maxPriceAgeSeconds
}) {
  const numericTimestamp =
    Number(timestamp);

  if (!Number.isFinite(numericTimestamp)) {
    return false;
  }

  const ageMilliseconds =
    getNowEpochMilliseconds() -
    numericTimestamp;

  if (ageMilliseconds < 0) {
    return false;
  }

  return (
    ageMilliseconds <=
    maxPriceAgeSeconds * 1000
  );
}

function isWithinTargetTolerance({
  observedPrice,
  targetPrice,
  tolerancePercent
}) {
  if (
    !Number.isFinite(observedPrice) ||
    !Number.isFinite(targetPrice) ||
    targetPrice <= 0
  ) {
    return false;
  }

  const differencePercent =
    Math.abs(
      observedPrice - targetPrice
    ) /
    targetPrice *
    100;

  return (
    differencePercent <=
    tolerancePercent
  );
}

async function hasRecentAlert({
  userId,
  companyId,
  targetPrice,
  cooldownSeconds
}) {
  const cooldownStart =
    new Date(
      Date.now() -
      cooldownSeconds * 1000
    );

  const existingNotification =
    await Notification.findOne({
      userId,
      companyId,
      type: "USER_TARGET_NEAR",
      triggerPrice: targetPrice,
      createdAt: {
        $gte: cooldownStart
      }
    })
      .select("_id")
      .lean();

  return Boolean(
    existingNotification
  );
}

export async function runAlertMonitorCycle() {
  const config =
    getAlertConfig();

  const redis =
    getRedisClient();

  const trackedCompanies =
    await UserCompany.find({
      userTargetPrice: {
        $ne: null
      }
    })
      .populate(
        "companyId",
        "name isin listings isActive"
      )
      .lean();

  let checked = 0;
  let triggered = 0;
  let stale = 0;
  let unavailable = 0;

  for (
    const record
    of trackedCompanies
  ) {
    const company =
      record.companyId;

    if (
      !company ||
      company.isActive !== true
    ) {
      continue;
    }

    const targetPrice =
      Number(
        record.userTargetPrice
      );

    if (
      !Number.isFinite(targetPrice) ||
      targetPrice <= 0
    ) {
      continue;
    }

    const listings =
      Array.isArray(company.listings)
        ? company.listings
        : [];

    let matchedPrice = null;

    for (
      const listing
      of listings
    ) {
      if (
        !listing.exchange ||
        !listing.tradingSymbol
      ) {
        continue;
      }

      const redisKey =
        `market:ltp:${listing.exchange}:${listing.tradingSymbol}`;

      const rawValue =
        await redis.get(
          redisKey
        );

      const payload =
        parsePricePayload(
          rawValue
        );

      if (
        !payload ||
        payload.ltp === undefined
      ) {
        continue;
      }

      checked += 1;

      if (
        !isPriceFresh({
          timestamp:
            payload.timestamp,
          maxPriceAgeSeconds:
            config.maxPriceAgeSeconds
        })
      ) {
        stale += 1;
        continue;
      }

      const observedPrice =
        Number(payload.ltp);

      if (
        !Number.isFinite(
          observedPrice
        )
      ) {
        continue;
      }

      matchedPrice = {
        observedPrice,
        exchange:
          payload.exchange ??
          listing.exchange,
        tradingSymbol:
          payload.tradingSymbol ??
          listing.tradingSymbol,
        timestamp:
          Number(
            payload.timestamp
          )
      };

      break;
    }

    if (!matchedPrice) {
      unavailable += 1;
      continue;
    }

    const nearTarget =
      isWithinTargetTolerance({
        observedPrice:
          matchedPrice.observedPrice,
        targetPrice,
        tolerancePercent:
          config.targetTolerancePercent
      });

    if (!nearTarget) {
      continue;
    }

    const recentlyAlerted =
      await hasRecentAlert({
        userId:
          record.userId,
        companyId:
          company._id,
        targetPrice,
        cooldownSeconds:
          config.cooldownSeconds
      });

    if (recentlyAlerted) {
      continue;
    }

    await Notification.create({
      userId:
        record.userId,

      companyId:
        company._id,

      type:
        "USER_TARGET_NEAR",

      title:
        `${company.name} is near your target`,

      message:
        `${company.name} is trading near your target price.`,

      triggerPrice:
        targetPrice,

      observedPrice:
        matchedPrice.observedPrice,

      metadata: {
        exchange:
          matchedPrice.exchange,
        tradingSymbol:
          matchedPrice.tradingSymbol,
        priceTimestamp:
          matchedPrice.timestamp,
        tolerancePercent:
          config.targetTolerancePercent
      }
    });

    triggered += 1;
  }

  return {
    tracked:
      trackedCompanies.length,
    checked,
    triggered,
    stale,
    unavailable
  };
}