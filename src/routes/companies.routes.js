import express from "express";

import { Company } from "../models/Company.js";
import { syncCompanyMaster } from "../services/companyMaster.service.js";
import { buildIntradayUniverse } from "../services/intradayUniverse.service.js";
import { getEventFeed } from "../services/news/eventFeed.service.js";
import {
  LatestIntradaySignal
} from "../models/LatestIntradaySignal.js";

const router = express.Router();

router.post("/sync", async (req, res) => {
  try {
    const result = await syncCompanyMaster();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Company master sync failed:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [
      total,
      crossListed,
      nseListed,
      bseListed,
      unclassified
    ] = await Promise.all([
      Company.countDocuments({
        isActive: true
      }),

      Company.countDocuments({
        isActive: true,
        "listings.1": {
          $exists: true
        }
      }),

      Company.countDocuments({
        isActive: true,
        "listings.exchange": "NSE"
      }),

      Company.countDocuments({
        isActive: true,
        "listings.exchange": "BSE"
      }),

      Company.countDocuments({
        isActive: true,
        classification: "UNCLASSIFIED"
      })
    ]);

    res.json({
      success: true,
      companies: {
        total,
        crossListed,
        nseListed,
        bseListed,
        unclassified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.post("/build-intraday-universe", async (req, res) => {
  try {
    const result = await buildIntradayUniverse();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("Intraday universe build failed:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get("/intraday-universe/stats", async (req, res) => {
  try {
    const [
      companies,
      nseListed,
      bseListed,
      dualListed
    ] = await Promise.all([

      Company.countDocuments({
        isActive: true,
        intradayEligible: true,
        classification: "COMPANY_EQUITY"
      }),

      Company.countDocuments({
        isActive: true,
        intradayEligible: true,
        "listings.exchange": "NSE"
      }),

      Company.countDocuments({
        isActive: true,
        intradayEligible: true,
        "listings.exchange": "BSE"
      }),

      Company.countDocuments({
        isActive: true,
        intradayEligible: true,
        "listings.1": {
          $exists: true
        }
      })
    ]);

    res.json({
      success: true,

      universe: {
        companies,
        nseListed,
        bseListed,
        dualListed
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function attachLatestIntradaySignals(companies) {
  if (!companies.length) {
    return companies;
  }

  const companyIds = companies.map(
    (company) => company._id
  );

  const signals = await LatestIntradaySignal.find({
    companyId: {
      $in: companyIds
    }
  }).lean();

  const signalByCompanyId = new Map(
    signals.map((signal) => [
      String(signal.companyId),
      signal
    ])
  );

  return companies.map((company) => ({
    ...company,
    intradaySignal:
      signalByCompanyId.get(
        String(company._id)
      ) || null
  }));
}

router.get("/intraday-universe", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 50, 1),
      200
    );
    const search = String(req.query.search || "").trim();

    const decision = String(
      req.query.decision || "ALL"
    )
      .trim()
      .toUpperCase();

    const query = {
      isActive: true,
      intradayEligible: true,
      classification: "COMPANY_EQUITY"
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { isin: { $regex: search, $options: "i" } },
        { aliases: { $regex: search, $options: "i" } },
        {
          "listings.tradingSymbol": {
            $regex: search,
            $options: "i"
          }
        }
      ];
    }

    if (decision === "ALL") {
      const [companies, total] = await Promise.all([
        Company.find(query)
          .select(
            "name isin aliases listings sector industry marketCap intradayEligible"
          )
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),

        Company.countDocuments(query)
      ]);

      const companiesWithSignals =
          await attachLatestIntradaySignals(
            companies
          );

        return res.json({
          success: true,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          companies: companiesWithSignals
        });
    }

    const signalQuery = {};

    if (decision !== "NO SIGNAL") {
      signalQuery.decision = decision;
    }

    const signalCompanyIds =
      await LatestIntradaySignal.distinct(
        "companyId",
        signalQuery
      );

    if (decision === "NO SIGNAL") {
      const allSignalCompanyIds =
        await LatestIntradaySignal.distinct(
          "companyId"
        );

      query._id = {
        $nin: allSignalCompanyIds
      };
    } else {
      query._id = {
        $in: signalCompanyIds
      };
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .select(
          "name isin aliases listings sector industry marketCap intradayEligible"
        )
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Company.countDocuments(query)
    ]);

    const companiesWithSignals =
      await attachLatestIntradaySignals(
        companies
      );

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      companies: companiesWithSignals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
export default router;