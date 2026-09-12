import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true
    },

    type: {
      type: String,
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    triggerPrice: {
      type: Number,
      default: null
    },

    observedPrice: {
      type: Number,
      default: null
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({
  userId: 1,
  createdAt: -1
});

export const Notification =
  mongoose.model(
    "Notification",
    notificationSchema
  );