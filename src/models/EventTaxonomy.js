import mongoose from "mongoose";

const eventTaxonomySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    parentCode: {
      type: String,
      index: true,
    },

    keywords: {
      type: [String],
      default: [],
    },

    phrases: {
      type: [String],
      default: [],
    },

    themes: {
      type: [String],
      default: [],
    },

    defaultHorizon: {
      type: String,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventTaxonomySchema.index({
  isActive: 1,
  priority: -1,
});

const EventTaxonomy =
  mongoose.models.EventTaxonomy ||
  mongoose.model(
    "EventTaxonomy",
    eventTaxonomySchema
  );

export default EventTaxonomy;