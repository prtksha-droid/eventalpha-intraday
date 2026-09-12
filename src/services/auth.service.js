import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "../models/User.js";
import { getAuthConfig } from "../config/auth.js";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function buildUserResponse(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

function createToken(user) {
  const config = getAuthConfig();

  return jwt.sign(
    {
      userId: user._id.toString()
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn
    }
  );
}

export async function registerUser({
  name,
  email,
  password
}) {
  const config = getAuthConfig();

  const normalizedName =
    String(name || "").trim();

  const normalizedEmail =
    normalizeEmail(email);

  if (
    !normalizedName ||
    !normalizedEmail ||
    !password
  ) {
    throw new Error(
      "Name, email and password are required"
    );
  }

  const existingUser =
    await User.findOne({
      email: normalizedEmail
    });

  if (existingUser) {
    throw new Error(
      "An account with this email already exists"
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      config.bcrypt.rounds
    );

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    passwordHash
  });

  const token = createToken(user);

  return {
    token,
    user: buildUserResponse(user)
  };
}

export async function loginUser({
  email,
  password
}) {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new Error(
      "Email and password are required"
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true
  });

  if (!user) {
    throw new Error(
      "Invalid email or password"
    );
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!passwordMatches) {
    throw new Error(
      "Invalid email or password"
    );
  }

  user.lastLoginAt = new Date();

  await user.save();

  const token = createToken(user);

  return {
    token,
    user: buildUserResponse(user)
  };
}