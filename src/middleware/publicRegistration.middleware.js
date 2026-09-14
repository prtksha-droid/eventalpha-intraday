import {
  getAuthRegistrationConfig
} from "../config/authRegistration.js";

export function requirePublicRegistrationEnabled(
  req,
  res,
  next
) {
  const config =
    getAuthRegistrationConfig();

  if (
    !config.publicRegistrationEnabled
  ) {
    return res
      .status(403)
      .json({
        success: false,
        error:
          "Public registration is currently disabled"
      });
  }

  return next();
}