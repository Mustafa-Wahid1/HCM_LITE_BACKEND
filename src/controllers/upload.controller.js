'use strict';

const { success } = require('../utils/response');
const AppError = require('../utils/AppError');

/**
 * POST /admin/uploads/product-image
 * multipart field name: "image"
 * returns { data: { url: "/uploads/...." } }
 */
const productImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Image file is required (field name: image)', 400);
    }
    const url = `/uploads/${req.file.filename}`;
    return success(res, { url, filename: req.file.filename }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { productImage };
