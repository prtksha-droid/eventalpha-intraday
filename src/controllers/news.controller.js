import {
  ingestNewsItem,
  ingestNewsBatch,
} from "../services/news/newsIngestion.service.js";
import {
  getEventFeed,
} from "../services/news/eventFeed.service.js";

export async function ingestSingleNews(req, res) {
  try {
    const result = await ingestNewsItem(req.body);

    return res.status(result.inserted ? 201 : 200).json({
      success: true,
      inserted: result.inserted,
      duplicate: result.duplicate,
      news: result.document,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function ingestNewsBatchController(req, res) {
  try {
    const items = Array.isArray(req.body)
      ? req.body
      : req.body?.items;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: "Request body must contain an items array",
      });
    }

    const results = await ingestNewsBatch(items);

    return res.json({
      success: true,
      total: results.length,
      inserted: results.filter((item) => item.inserted).length,
      duplicates: results.filter((item) => item.duplicate).length,
      failed: results.filter((item) => !item.success).length,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
export async function getEventFeedController(req, res) {
  try {
    const limit = Number(req.query.limit) || 50;
    const skip = Number(req.query.skip) || 0;

    const events = await getEventFeed({
      limit,
      skip,
    });

    return res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}