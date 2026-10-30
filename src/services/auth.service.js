'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', env.BCRYPT_COST);

const register = async ({ name, email, phone, password }) => {
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new AppError(
      'This email is already associated with another account.',
      409
    );
  }
  if (phone) {
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      throw new AppError(
        'This mobile number is already associated with another account.',
        409
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone: phone || undefined,
    passwordHash,
    role: 'CUSTOMER',
  });

  const token = signToken(user);
  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new AppError('Invalid email or password', 401);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('User account is deactivated. Please contact support.', 403);
  }

  const token = signToken(user);
  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    totalOrders: user.totalOrders,
    totalSpent: Number(user.totalSpent).toFixed(2),
    createdAt: user.createdAt,
  };
};

const signToken = (user) => {
  return jwt.sign(
    { id: user._id.toString() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

module.exports = {
  register,
  login,
  getMe,
  signToken,
};
