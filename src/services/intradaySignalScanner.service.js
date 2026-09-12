import { LatestIntradaySignal } from "../models/LatestIntradaySignal.js";

import {
  evaluateSignal
} from "./signalEngine.service.js";

import {
  aggregateCompanySignals
} from "./companySignal.service.js";
import { Company } from "../models/Company.js";
import {
  getIntradaySignalScannerConfig
} from "../config/intradaySignalScanner.js";

export async function evaluateIntradayCompany(
  company
) {
  if (!company?._id) {
    throw new Error(
      "company._id is required"
    );
  }

  if (!company?.isin) {
    throw new Error(
      "company.isin is required"
    );
  }

  const listings = (
    Array.isArray(company.listings)
      ? company.listings
      : []
  ).filter(
    (listing) =>
      listing?.isIntraday === true &&
      listing?.exchange &&
      listing?.tradingSymbol
  );

  const signals = await Promise.all(
    listings.map((listing) =>
      evaluateSignal({
        exchange: listing.exchange,
        tradingSymbol:
          listing.tradingSymbol
      })
    )
  );

  const companySignal =
    aggregateCompanySignals(signals);

  const evaluatedAt = new Date();

  await LatestIntradaySignal.updateOne(
    {
      companyId: company._id
    },
    {
      $set: {
        companyId: company._id,
        isin: company.isin,

        decision:
          companySignal.decision,

        actionable:
          companySignal.actionable,

        reason:
          companySignal.reason,

        listingCount:
          companySignal.listingCount,

        actionableListingCount:
          companySignal
            .actionableListingCount,

        agreement:
          companySignal.agreement,

        policy:
          companySignal.policy,

        signals:
          companySignal.signals,

        evaluatedAt
      }
    },
    {
      upsert: true
    }
  );

  return {
    companyId: company._id,
    isin: company.isin,
    evaluatedAt,
    ...companySignal
  };
}

export async function getIntradaySignalUniverse() {
  return Company.find({
    isActive: true,
    intradayEligible: true
  })
    .select({
      _id: 1,
      isin: 1,
      name: 1,
      listings: 1
    })
    .sort({
      _id: 1
    })
    .lean();
}
async function processWithConcurrency({
  items,
  concurrency,
  handler
}) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex =
        nextIndex;

      nextIndex += 1;

      if (
        currentIndex >=
        items.length
      ) {
        return;
      }

      try {
        const result =
          await handler(
            items[currentIndex]
          );

        results[currentIndex] = {
          status: "fulfilled",
          value: result
        };
      } catch (error) {
        results[currentIndex] = {
          status: "rejected",
          reason:
            error instanceof Error
              ? error.message
              : String(error)
        };
      }
    }
  }

  const workerCount =
    Math.min(
      concurrency,
      items.length
    );

  await Promise.all(
    Array.from(
      {
        length: workerCount
      },
      () => worker()
    )
  );

  return results;
}
export async function evaluateIntradaySignalBatch(
  companies
) {
  const config =
    getIntradaySignalScannerConfig();

  if (!Array.isArray(companies)) {
    throw new Error(
      "companies must be an array"
    );
  }

  const batch =
    companies.slice(
      0,
      config.batchSize
    );

  const results =
    await processWithConcurrency({
      items: batch,
      concurrency:
        config.concurrency,
      handler:
        evaluateIntradayCompany
    });

  return {
    requestedCount:
      companies.length,

    processedCount:
      batch.length,

    fulfilledCount:
      results.filter(
        (result) =>
          result.status ===
          "fulfilled"
      ).length,

    rejectedCount:
      results.filter(
        (result) =>
          result.status ===
          "rejected"
      ).length,

    results
  };
}
export async function runIntradaySignalScannerCycle() {
  const config =
    getIntradaySignalScannerConfig();

  const companies =
    await getIntradaySignalUniverse();

  let processedCount = 0;
  let fulfilledCount = 0;
  let rejectedCount = 0;

  for (
    let offset = 0;
    offset < companies.length;
    offset += config.batchSize
  ) {
    const batch =
      companies.slice(
        offset,
        offset + config.batchSize
      );

    const batchResult =
      await evaluateIntradaySignalBatch(
        batch
      );

    processedCount +=
      batchResult.processedCount;

    fulfilledCount +=
      batchResult.fulfilledCount;

    rejectedCount +=
      batchResult.rejectedCount;
  }

  return {
    universeCount:
      companies.length,

    processedCount,
    fulfilledCount,
    rejectedCount
  };
}