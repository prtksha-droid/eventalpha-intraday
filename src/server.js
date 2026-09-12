import "dotenv/config";

import app from "./app.js";
import {
  connectMongo
} from "./config/mongo.js";
import {
  connectRedis
} from "./config/redis.js";
import {
  publishGrowwAccessToken
} from "./services/growwTokenStore.service.js";

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT is required");
}

async function startServer() {
  try {
    await connectMongo();

    await connectRedis();

    await publishGrowwAccessToken();

    app.listen(PORT, () => {
      console.log(
        `EventAlpha Intraday running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start EventAlpha:",
      error
    );

    process.exit(1);
  }
}

startServer();