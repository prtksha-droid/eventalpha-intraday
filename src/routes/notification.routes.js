import express from "express";

import {
  getNotificationsController,
  markNotificationReadController
} from "../controllers/notification.controller.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  getNotificationsController
);

router.patch(
  "/:notificationId/read",
  requireAuth,
  markNotificationReadController
);

export default router;