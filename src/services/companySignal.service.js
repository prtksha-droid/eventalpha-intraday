import {
  getCompanySignalConfig,
} from "../config/companySignal.js";

export function aggregateCompanySignals(
  signals = []
) {
  const config =
    getCompanySignalConfig();

  const validSignals =
    signals.filter(Boolean);

  const actionableSignals =
    validSignals.filter(
      (signal) =>
        signal.actionable === true &&
        signal.decision !== "PENDING"
    );

  if (!actionableSignals.length) {
    return {
      decision: "PENDING",
      actionable: false,
      reason:
        "No exchange has sufficient ready technical evidence",

      listingCount:
        validSignals.length,

      actionableListingCount: 0,

      agreement: null,

      policy:
        config.policy,

      signals:
        validSignals,
    };
  }

  const decisions =
    actionableSignals.map(
      (signal) => signal.decision
    );

  const uniqueDecisions =
    [...new Set(decisions)];

  const allAgree =
    uniqueDecisions.length === 1;

  if (allAgree) {
    return {
      decision:
        uniqueDecisions[0],

      actionable: true,

      reason:
        "Actionable exchange signals agree",

      listingCount:
        validSignals.length,

      actionableListingCount:
        actionableSignals.length,

      agreement: {
        allAgree: true,
        decisions,
      },

      policy:
        config.policy,

      signals:
        validSignals,
    };
  }

  return {
    decision: "WATCH",
    actionable: true,
    reason:
      "Actionable exchange signals disagree",

    listingCount:
      validSignals.length,

    actionableListingCount:
      actionableSignals.length,

    agreement: {
      allAgree: false,
      decisions,
    },

    policy:
      config.policy,

    signals:
      validSignals,
  };
}