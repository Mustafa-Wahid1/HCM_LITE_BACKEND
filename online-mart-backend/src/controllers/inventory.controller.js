'use strict';

const inventoryService = require('../services/inventory.service');
const { success } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const result = await inventoryService.list(req.query);
    return success(res, result.data, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await inventoryService.getById(req.params.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await inventoryService.create(req.body, req.user.id);
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
};

const adjust = async (req, res, next) => {
  try {
    const data = await inventoryService.adjust(req.body, req.user.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const listTransactions = async (req, res, next) => {
  try {
    const result = await inventoryService.listTransactions(req.params.id, req.query);
    return success(res, result.data, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const updateThreshold = async (req, res, next) => {
  try {
    const data = await inventoryService.updateThreshold(
      req.params.id,
      req.body.lowStockThreshold
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  create,
  adjust,
  listTransactions,
  updateThreshold,
};
