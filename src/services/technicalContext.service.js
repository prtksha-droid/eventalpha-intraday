import {
  getTechnicalSnapshots
} from "./technicalSnapshot.service.js";

export async function getTechnicalContext({
  intervals,
  exchange,
  tradingSymbol
}) {
  if (
    !Array.isArray(intervals) ||
    intervals.length === 0
  ) {
    throw new Error(
      "intervals is required"
    );
  }

  const snapshots =
    await getTechnicalSnapshots({
      intervals,
      exchange,
      tradingSymbol
    });

  const availableIntervals = [];
  const readyIntervals = [];
  const pendingIntervals = [];
  const missingIntervals = [];

  for (const interval of intervals) {
    const snapshot =
      snapshots[interval];

    if (!snapshot) {
      missingIntervals.push(interval);
      continue;
    }

    availableIntervals.push(interval);

    if (snapshot.ready) {
      readyIntervals.push(interval);
    } else {
      pendingIntervals.push(interval);
    }
  }

  return {
    exchange:
      exchange.toUpperCase(),

    tradingSymbol:
      tradingSymbol.toUpperCase(),

    intervals: {
      requested: intervals,
      available: availableIntervals,
      ready: readyIntervals,
      pending: pendingIntervals,
      missing: missingIntervals
    },

    snapshots
  };
}