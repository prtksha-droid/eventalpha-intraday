import { UserCompany } from "../models/UserCompany.js";
import { Company } from "../models/Company.js";

export async function upsertUserCompany({
  userId,
  companyId,
  isWatchlisted,
  isInvested,
  quantity,
  averagePurchasePrice,
  userTargetPrice
}) {
  const company = await Company.findOne({
    _id: companyId,
    isActive: true
  });

  if (!company) {
    throw new Error(
      "Company not found"
    );
  }

  const update = {};

  if (
    typeof isWatchlisted === "boolean"
  ) {
    update.isWatchlisted =
      isWatchlisted;
  }

  if (
    typeof isInvested === "boolean"
  ) {
    update.isInvested =
      isInvested;
  }

  if (
    quantity !== undefined
  ) {
    update.quantity =
      quantity === null
        ? null
        : Number(quantity);
  }

  if (
    averagePurchasePrice !== undefined
  ) {
    update.averagePurchasePrice =
      averagePurchasePrice === null
        ? null
        : Number(averagePurchasePrice);
  }

  if (
    userTargetPrice !== undefined
  ) {
    update.userTargetPrice =
      userTargetPrice === null
        ? null
        : Number(userTargetPrice);
  }

  const record =
    await UserCompany.findOneAndUpdate(
      {
        userId,
        companyId
      },
      {
        $set: update
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

  return record;
}

export async function getUserCompanies(
  userId
) {
  return UserCompany.find({
    userId
  })
    .populate(
      "companyId",
      "name isin listings sector industry"
    )
    .sort({
      updatedAt: -1
    });
}