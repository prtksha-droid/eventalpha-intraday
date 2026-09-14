import express from "express";

import {
  ingestSingleNews,
  ingestNewsBatchController,
  getEventFeedController,
} from "../controllers/news.controller.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

import {
  requireOperationalRoutesEnabled
} from "../middleware/operationalRoutes.middleware.js";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/events",
  getEventFeedController
);

router.post(
  "/ingest",
  requireOperationalRoutesEnabled,
  ingestSingleNews
);

router.post(
  "/ingest/batch",
  requireOperationalRoutesEnabled,
  ingestNewsBatchController
);

export default router;