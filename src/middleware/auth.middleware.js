import jwt from "jsonwebtoken";

import { User } from "../models/User.js";
import { getAuthConfig } from "../config/auth.js";

export async function requireAuth(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const token =
      authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const config = getAuthConfig();

    const payload = jwt.verify(
      token,
      config.jwt.secret
    );

    const user = await User.findOne({
      _id: payload.userId,
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    req.user = user;

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication"
    });
  }
}