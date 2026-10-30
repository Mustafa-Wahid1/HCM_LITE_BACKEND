'use strict';

const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List active products (public)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated active products
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('categoryId').optional().isMongoId(),
    query('search').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
  ],
  validate,
  productController.listPublic
);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product detail (public, active only)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail
 *       404:
 *         description: Not found or inactive
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid product id')],
  validate,
  productController.getPublicById
);

module.exports = router;
