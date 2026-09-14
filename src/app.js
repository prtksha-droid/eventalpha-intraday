import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { getRedisClient } from "./config/redis.js";
import instrumentRoutes from "./routes/instruments.routes.js";
import companyRoutes from "./routes/companies.routes.js";
import marketRoutes from "./routes/market.routes.js";
import newsRoutes from "./routes/news.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userCompanyRoutes from "./routes/userCompany.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import {
  getCorsOptions
} from "./config/cors.js";

const app = express();

app.use(helmet());
app.use(
  cors(
    getCorsOptions()
  )
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/user-companies", userCompanyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/news", newsRoutes);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "eventalpha-intraday",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});
app.get("/health/dependencies", async (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;

  let redisConnected = false;

  try {
    const redis = getRedisClient();
    redisConnected = redis.isReady;
  } catch {
    redisConnected = false;
  }

  const healthy = mongoConnected && redisConnected;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    dependencies: {
      mongodb: mongoConnected ? "connected" : "disconnected",
      redis: redisConnected ? "connected" : "disconnected"
    },
    timestamp: new Date().toISOString()
  });
});
app.use("/api/instruments", instrumentRoutes);
export default app;