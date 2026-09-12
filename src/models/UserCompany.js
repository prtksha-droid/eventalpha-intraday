import mongoose from "mongoose";

const userCompanySchema = new mongoose.Schema(
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

    isWatchlisted: {
      type: Boolean,
      default: false,
      index: true
    },

    isInvested: {
      type: Boolean,
      default: false,
      index: true
    },

    quantity: {
      type: Number,
      default: null
    },

    averagePurchasePrice: {
      type: Number,
      default: null
    },

    userTargetPrice: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userCompanySchema.index(
  {
    userId: 1,
    companyId: 1
  },
  {
    unique: true
  }
);

export const UserCompany =
  mongoose.model(
    "UserCompany",
    userCompanySchema
  );