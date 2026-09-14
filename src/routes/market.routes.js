import express from "express";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

import { getIntradayMarketListings } from "../services/marketUniverse.service.js";
import { shardItems } from "../utils/shard.js";

import {
  getTechnicalSnapshot,
  getTechnicalSnapshots
} from "../services/technicalSnapshot.service.js";
import {
  getTechnicalContext
} from "../services/technicalContext.service.js";
import {
  getSignalContext
} from "../services/signalContext.service.js";
import {
  evaluateSignal
} from "../services/signalEngine.service.js";
import {
  getMarketMemory
} from "../services/marketMemory.service.js";
import {
  evaluateMarketMemoryEvidence
} from "../services/marketMemoryEvidence.service.js";
import {
  getMarketSessionConfig,
  isMarketSessionActive
} from "../config/marketSession.js";

const router = express.Router();
router.use(requireAuth);

router.get(
  "/session",
  (req, res) => {
    try {
      const now = new Date();

      const config =
        getMarketSessionConfig();

      return res.json({
        success: true,

        session: {
          active:
            isMarketSessionActive(
              now
            ),

          timezone:
            config.timezone,

          openTime:
            config.openTime,

          closeTime:
            config.closeTime,

          checkedAt:
            now.toISOString()
        }
      });
    } catch (error) {
      console.error(
        "Unable to determine market session:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          error:
            "Unable to determine market session status"
        });
    }
  }
);

router.get("/feed-plan", async (req, res) => {
  try {
    const shardSize =
      Number(process.env.MARKET_FEED_MAX_SUBSCRIPTIONS);

    if (!shardSize) {
      throw new Error(
        "MARKET_FEED_MAX_SUBSCRIPTIONS is required"
      );
    }

    const listings =
      await getIntradayMarketListings();

    const shards =
      shardItems(listings, shardSize);

    res.json({
      success: true,

      feedPlan: {
        totalListings: listings.length,

        shardSize,

        shardCount: shards.length,

        shards: shards.map(
          (items, index) => ({
            shardId: index,
            instrumentCount: items.length,

            exchanges: {
              NSE: items.filter(
                (item) =>
                  item.exchange === "NSE"
              ).length,

              BSE: items.filter(
                (item) =>
                  item.exchange === "BSE"
              ).length
            }
          })
        )
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
});
router.get(
  "/technical/:interval/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        interval,
        exchange,
        tradingSymbol
      } = req.params;

      const snapshot =
          await getTechnicalSnapshot({
            interval,
            exchange,
            tradingSymbol
          });

      if (
        !snapshot ||
        Object.keys(snapshot).length === 0
      ) {
        return res.status(404).json({
          success: false,
          error: "Technical snapshot not found"
        });
      }

      res.json({
        success: true,
        technical: snapshot
      });

    } catch (error) {
      console.error(
        "Technical snapshot lookup failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/technical/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        exchange,
        tradingSymbol
      } = req.params;

      const intervals = String(
        req.query.intervals || ""
      )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!intervals.length) {
        return res.status(400).json({
          success: false,
          error: "intervals query parameter is required"
        });
      }

      const technical =
        await getTechnicalSnapshots({
          intervals,
          exchange,
          tradingSymbol
        });

      res.json({
        success: true,
        exchange: exchange.toUpperCase(),
        tradingSymbol: tradingSymbol.toUpperCase(),
        technical
      });

    } catch (error) {
      console.error(
        "Multi-interval technical lookup failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
router.get(
  "/technical-context/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        exchange,
        tradingSymbol
      } = req.params;

      const intervals = String(
        req.query.intervals || ""
      )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!intervals.length) {
        return res.status(400).json({
          success: false,
          error: "intervals query parameter is required"
        });
      }

      const context =
        await getTechnicalContext({
          intervals,
          exchange,
          tradingSymbol
        });

      res.json({
        success: true,
        technicalContext: context
      });

    } catch (error) {
      console.error(
        "Technical context lookup failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
router.get(
  "/signal-context/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        exchange,
        tradingSymbol
      } = req.params;

      const signalContext =
        await getSignalContext({
          exchange,
          tradingSymbol
        });

      res.json({
        success: true,
        signalContext
      });

    } catch (error) {
      console.error(
        "Signal context lookup failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
router.get(
  "/signal/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        exchange,
        tradingSymbol
      } = req.params;

      const signal =
        await evaluateSignal({
          exchange,
          tradingSymbol
        });

      res.json({
        success: true,
        signal
      });

    } catch (error) {
      console.error(
        "Signal evaluation failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
router.get(
  "/market-memory/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        exchange,
        tradingSymbol
      } = req.params;

      const marketMemory =
        await getMarketMemory({
          exchange,
          tradingSymbol
        });

      res.json({
        success: true,
        marketMemory
      });

    } catch (error) {
      console.error(
        "Market memory lookup failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
router.get(
  "/market-memory-evidence/:exchange/:tradingSymbol",
  async (req, res) => {
    try {
      const {
        exchange,
        tradingSymbol
      } = req.params;

      const marketMemory =
        await getMarketMemory({
          exchange,
          tradingSymbol
        });

      const evidence =
        evaluateMarketMemoryEvidence(
          marketMemory
        );

      res.json({
        success: true,
        evidence
      });

    } catch (error) {
      console.error(
        "Market memory evidence failed:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
export default router;