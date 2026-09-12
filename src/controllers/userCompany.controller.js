import {
  upsertUserCompany,
  getUserCompanies
} from "../services/userCompany.service.js";

export async function upsertUserCompanyController(
  req,
  res
) {
  try {
    const record =
      await upsertUserCompany({
        userId: req.user._id,
        ...req.body
      });

    return res.json({
      success: true,
      record
    });
  } catch (error) {
    const statusCode =
      error.message === "Company not found"
        ? 404
        : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

export async function getUserCompaniesController(
  req,
  res
) {
  try {
    const records =
      await getUserCompanies(
        req.user._id
      );

    return res.json({
      success: true,
      records
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}