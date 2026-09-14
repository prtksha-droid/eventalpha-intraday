import express from "express";

import {
  registerController,
  loginController,
  getCurrentUserController
} from "../controllers/auth.controller.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

import {
  loginRateLimit
} from "../middleware/loginRateLimit.middleware.js";

import {
  requirePublicRegistrationEnabled
} from "../middleware/publicRegistration.middleware.js";

const router = express.Router();

router.post(
  "/register",
  requirePublicRegistrationEnabled,
  registerController
);

router.post(
  "/login",
  loginRateLimit,
  loginController
);

router.get(
  "/me",
  requireAuth,
  getCurrentUserController
);

export default router;