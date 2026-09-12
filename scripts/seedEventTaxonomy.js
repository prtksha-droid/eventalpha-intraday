import mongoose from "mongoose";

import EventTaxonomy from "../src/models/EventTaxonomy.js";

import {
  eventTaxonomyData,
} from "../src/config/eventTaxonomy.data.js";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/eventalpha_intraday";

async function run() {
  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

    const operations =
      eventTaxonomyData.map(
        (definition) => ({
          updateOne: {
            filter: {
              code: definition.code,
            },

            update: {
              $set: definition,
            },

            upsert: true,
          },
        })
      );

    const result =
      await EventTaxonomy.bulkWrite(
        operations,
        {
          ordered: false,
        }
      );

    const total =
      await EventTaxonomy.countDocuments({
        isActive: true,
      });

    console.log(
      JSON.stringify(
        {
          taxonomyDefinitions:
            eventTaxonomyData.length,

          matched:
            result.matchedCount,

          modified:
            result.modifiedCount,

          upserted:
            result.upsertedCount,

          activeTaxonomies:
            total,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();