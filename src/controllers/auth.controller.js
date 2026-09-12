import {
  registerUser,
  loginUser
} from "../services/auth.service.js";

export async function registerController(
  req,
  res
) {
  try {
    const result = await registerUser(
      req.body
    );

    return res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    const statusCode =
      error.message ===
      "An account with this email already exists"
        ? 409
        : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

export async function loginController(
  req,
  res
) {
  try {
    const result = await loginUser(
      req.body
    );

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const statusCode =
      error.message ===
      "Invalid email or password"
        ? 401
        : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}
export async function getCurrentUserController(
  req,
  res
) {
  return res.json({
    success: true,
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email
    }
  });
}