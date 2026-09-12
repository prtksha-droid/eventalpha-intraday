import express from "express";

import {
  upsertUserCompanyController,
  getUserCompaniesController
} from "../controllers/userCompany.controller.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  getUserCompaniesController
);

router.put(
  "/",
  requireAuth,
  upsertUserCompanyController
);

export default router;