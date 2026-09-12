import express from "express";

import {
  registerController,
  loginController,
  getCurrentUserController
} from "../controllers/auth.controller.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  registerController
);

router.post(
  "/login",
  loginController
);

router.get(
  "/me",
  requireAuth,
  getCurrentUserController
);

export default router;