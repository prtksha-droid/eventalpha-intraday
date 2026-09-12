import express from "express";

import {
  ingestSingleNews,
  ingestNewsBatchController,
  getEventFeedController,
} from "../controllers/news.controller.js";

const router = express.Router();
router.get("/events", getEventFeedController);
router.post("/ingest", ingestSingleNews);
router.post("/ingest/batch", ingestNewsBatchController);

export default router;