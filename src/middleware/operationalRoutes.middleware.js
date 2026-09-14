import {
  getOperationalRoutesConfig
} from "../config/operationalRoutes.js";

const config =
  getOperationalRoutesConfig();

export function requireOperationalRoutesEnabled(
  req,
  res,
  next
) {
  if (!config.enabled) {
    return res
      .status(403)
      .json({
        success: false,
        error:
          "Operational API routes are disabled"
      });
  }

  return next();
}