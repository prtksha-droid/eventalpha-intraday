import express from "express";

import { Instrument } from "../models/Instrument.js";
import { syncInstrumentMaster } from "../services/instrumentSync.service.js";

const router = express.Router();

router.post("/sync", async (req, res) => {
  try {
    const result = await syncInstrumentMaster();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Instrument sync failed:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [total, nse, bse] = await Promise.all([
      Instrument.countDocuments({
        isActive: true
      }),

      Instrument.countDocuments({
        exchange: "NSE",
        isActive: true
      }),

      Instrument.countDocuments({
        exchange: "BSE",
        isActive: true
      })
    ]);

    res.json({
      success: true,
      instruments: {
        total,
        nse,
        bse
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get("/classifications", async (req, res) => {
  try {
    const [instrumentTypes, series, exchanges] = await Promise.all([
      Instrument.aggregate([
        {
          $group: {
            _id: "$instrumentType",
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]),

      Instrument.aggregate([
        {
          $group: {
            _id: "$series",
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]),

      Instrument.aggregate([
        {
          $group: {
            _id: "$exchange",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      instrumentTypes,
      series,
      exchanges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get("/series", async (req, res) => {
  try {
    const series = await Instrument.aggregate([
      {
        $match: {
          isActive: true,
          instrumentType: "EQ"
        }
      },
      {
        $group: {
          _id: {
            exchange: "$exchange",
            series: "$series"
          },
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          "_id.exchange": 1,
          count: -1
        }
      }
    ]);

    res.json({
      success: true,
      series
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get("/samples", async (req, res) => {
  try {
    const groups = await Instrument.aggregate([
      {
        $match: {
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            exchange: "$exchange",
            series: "$series"
          },
          samples: {
            $push: {
              tradingSymbol: "$tradingSymbol",
              name: "$name",
              instrumentType: "$instrumentType",
              isin: "$isin",
              buyAllowed: "$buyAllowed",
              sellAllowed: "$sellAllowed"
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          samples: {
            $slice: ["$samples", 10]
          }
        }
      },
      {
        $sort: {
          "_id.exchange": 1,
          "_id.series": 1
        }
      }
    ]);

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get("/universe-analysis", async (req, res) => {
  try {
    const [
      uniqueIsins,
      isinPrefixes,
      crossListed,
      missingIsin
    ] = await Promise.all([

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: "$isin"
          }
        },
        {
          $count: "count"
        }
      ]),

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $project: {
            prefix: {
              $substrCP: ["$isin", 0, 3]
            }
          }
        },
        {
          $group: {
            _id: "$prefix",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]),

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: "$isin",

            exchanges: {
              $addToSet: "$exchange"
            },

            names: {
              $addToSet: "$name"
            },

            symbols: {
              $addToSet: "$tradingSymbol"
            }
          }
        },
        {
          $match: {
            "exchanges.1": {
              $exists: true
            }
          }
        },
        {
          $count: "count"
        }
      ]),

      Instrument.countDocuments({
        isActive: true,
        $or: [
          { isin: null },
          { isin: "" },
          { isin: { $exists: false } }
        ]
      })
    ]);

    res.json({
      success: true,

      analysis: {
        activeInstrumentRows:
          await Instrument.countDocuments({
            isActive: true
          }),

        uniqueIsins:
          uniqueIsins[0]?.count ?? 0,

        crossListedIsins:
          crossListed[0]?.count ?? 0,

        missingIsin,

        isinPrefixes
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
});
router.get("/intraday-analysis", async (req, res) => {
  try {
    const [
      total,
      intradayEnabled,
      intradayDisabled,
      byExchange,
      bySeries,
      byInstrumentType
    ] = await Promise.all([

      Instrument.countDocuments({
        isActive: true
      }),

      Instrument.countDocuments({
        isActive: true,
        isIntraday: true
      }),

      Instrument.countDocuments({
        isActive: true,
        isIntraday: false
      }),

      Instrument.aggregate([
        {
          $match: {
            isActive: true
          }
        },
        {
          $group: {
            _id: {
              exchange: "$exchange",
              isIntraday: "$isIntraday"
            },
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            "_id.exchange": 1,
            "_id.isIntraday": -1
          }
        }
      ]),

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isIntraday: true
          }
        },
        {
          $group: {
            _id: {
              exchange: "$exchange",
              series: "$series"
            },
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            "_id.exchange": 1,
            count: -1
          }
        }
      ]),

      Instrument.aggregate([
        {
          $match: {
            isActive: true
          }
        },
        {
          $group: {
            _id: {
              instrumentType: "$instrumentType",
              isIntraday: "$isIntraday"
            },
            count: {
              $sum: 1
            }
          }
        }
      ])
    ]);

    res.json({
      success: true,

      analysis: {
        total,
        intradayEnabled,
        intradayDisabled,
        byExchange,
        bySeries,
        byInstrumentType
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get("/intraday-universe-analysis", async (req, res) => {
  try {
    const [
      uniqueIsins,
      crossListed,
      missingIsin,
      isinPrefixes,
      prefixByExchangeAndSeries
    ] = await Promise.all([

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isIntraday: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: "$isin"
          }
        },
        {
          $count: "count"
        }
      ]),

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isIntraday: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: "$isin",
            exchanges: {
              $addToSet: "$exchange"
            }
          }
        },
        {
          $match: {
            "exchanges.1": {
              $exists: true
            }
          }
        },
        {
          $count: "count"
        }
      ]),

      Instrument.countDocuments({
        isActive: true,
        isIntraday: true,
        $or: [
          { isin: null },
          { isin: "" },
          { isin: { $exists: false } }
        ]
      }),

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isIntraday: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $project: {
            prefix: {
              $substrCP: ["$isin", 0, 3]
            }
          }
        },
        {
          $group: {
            _id: "$prefix",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        }
      ]),

      Instrument.aggregate([
        {
          $match: {
            isActive: true,
            isIntraday: true,
            isin: { $nin: [null, ""] }
          }
        },
        {
          $project: {
            exchange: 1,
            series: 1,
            prefix: {
              $substrCP: ["$isin", 0, 3]
            }
          }
        },
        {
          $group: {
            _id: {
              exchange: "$exchange",
              series: "$series",
              prefix: "$prefix"
            },
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            "_id.exchange": 1,
            "_id.series": 1,
            count: -1
          }
        }
      ])
    ]);

    res.json({
      success: true,

      analysis: {
        intradayListings:
          await Instrument.countDocuments({
            isActive: true,
            isIntraday: true
          }),

        uniqueIntradayIsins:
          uniqueIsins[0]?.count ?? 0,

        crossListedIntradayIsins:
          crossListed[0]?.count ?? 0,

        missingIsin,

        isinPrefixes,

        prefixByExchangeAndSeries
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
});
export default router;