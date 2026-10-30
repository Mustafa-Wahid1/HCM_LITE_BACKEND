'use strict';

const authService = require('../services/auth.service');
const { success } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
