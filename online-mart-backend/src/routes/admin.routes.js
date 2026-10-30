'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const { requireAdmin } = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const categoryController = require('../controllers/category.controller');
const productController = require('../controllers/product.controller');
const inventoryController = require('../controllers/inventory.controller');
const orderController = require('../controllers/order.controller');
const userController = require('../controllers/user.controller');

// All admin routes require ADMIN role
router.use(requireAdmin);

// ── Categories ──────────────────────────────────────────────
router.get(
  '/categories',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isActive').optional().isIn(['true', 'false']),
    query('parentId').optional(),
    query('search').optional().isString(),
  ],
  validate,
  categoryController.listAdmin
);

router.post(
  '/categories',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('parentId').optional({ nullable: true }).isMongoId().withMessage('Invalid parentId'),
    body('description').optional().isString().isLength({ max: 500 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  categoryController.create
);

router.patch(
  '/categories/:id',
  [
    param('id').isMongoId().withMessage('Invalid category id'),
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('parentId').optional({ nullable: true }),
    body('description').optional().isString().isLength({ max: 500 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  categoryController.update
);

router.delete(
  '/categories/:id',
  [param('id').isMongoId().withMessage('Invalid category id')],
  validate,
  categoryController.remove
);

// ── Products ────────────────────────────────────────────────
router.get(
  '/products',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isActive').optional().isIn(['true', 'false']),
    query('categoryId').optional().isMongoId(),
    query('search').optional().isString(),
  ],
  validate,
  productController.listAdmin
);

router.get(
  '/products/:id',
  [param('id').isMongoId().withMessage('Invalid product id')],
  validate,
  productController.getAdminById
);

router.post(
  '/products',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
    body('categoryId').notEmpty().isMongoId().withMessage('Valid categoryId is required'),
    body('price').isFloat({ min: 0.01 }).withMessage('Price must be >= 0.01'),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('unit').optional().isString().isLength({ max: 30 }),
    body('minimumOrderQuantity').optional().isInt({ min: 1 }),
    body('maximumOrderQuantity').optional().isInt({ min: 1 }),
    body('imageUrl').optional().isString(),
    body('initialQty').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
  ],
  validate,
  productController.create
);

router.patch(
  '/products/:id',
  [
    param('id').isMongoId().withMessage('Invalid product id'),
    body('name').optional().trim().notEmpty().isLength({ max: 200 }),
    body('categoryId').optional().isMongoId(),
    body('price').optional().isFloat({ min: 0.01 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('unit').optional().isString().isLength({ max: 30 }),
    body('minimumOrderQuantity').optional().isInt({ min: 1 }),
    body('maximumOrderQuantity').optional().isInt({ min: 1 }),
    body('imageUrl').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  productController.update
);

// ── Inventory ───────────────────────────────────────────────
router.get(
  '/inventory',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
    query('productId').optional().isMongoId(),
  ],
  validate,
  inventoryController.list
);

router.get(
  '/inventory/:id',
  [param('id').isMongoId().withMessage('Invalid inventory id')],
  validate,
  inventoryController.getById
);

router.post(
  '/inventory',
  [
    body('productId').notEmpty().isMongoId().withMessage('Valid productId is required'),
    body('qtyOnHand').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
  ],
  validate,
  inventoryController.create
);

router.post(
  '/inventory/adjustments',
  [
    body('productId').optional().isMongoId(),
    body('inventoryId').optional().isMongoId(),
    body('type')
      .notEmpty()
      .withMessage('type is required')
      .isString(),
    body('quantity')
      .notEmpty()
      .withMessage('quantity is required')
      .isInt()
      .withMessage('quantity must be an integer'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  inventoryController.adjust
);

router.get(
  '/inventory/:id/transactions',
  [
    param('id').isMongoId().withMessage('Invalid inventory id'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
  ],
  validate,
  inventoryController.listTransactions
);

router.patch(
  '/inventory/:id',
  [
    param('id').isMongoId().withMessage('Invalid inventory id'),
    body('lowStockThreshold').notEmpty().isInt({ min: 0 }),
  ],
  validate,
  inventoryController.updateThreshold
);

// ── Orders ──────────────────────────────────────────────────
router.get(
  '/orders',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('paymentStatus').optional().isString(),
    query('userId').optional().isMongoId(),
    query('orderNumber').optional().isString(),
    query('deliveryType').optional().isIn(['DELIVERY', 'PICKUP']),
  ],
  validate,
  orderController.listAdmin
);

router.get(
  '/orders/:id',
  [param('id').isMongoId().withMessage('Invalid order id')],
  validate,
  orderController.getAdminById
);

router.patch(
  '/orders/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid order id'),
    body('status').notEmpty().isString().withMessage('status is required'),
  ],
  validate,
  orderController.updateStatus
);

router.patch(
  '/orders/:id/cancel',
  [
    param('id').isMongoId().withMessage('Invalid order id'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  orderController.cancelAdmin
);


// ── Customers ───────────────────────────────────────────────
router.get(
  '/customers',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isActive').optional().isIn(['true', 'false']),
    query('search').optional().isString(),
  ],
  validate,
  userController.listCustomers
);

router.patch(
  '/customers/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid customer id'),
    body('isActive').notEmpty().isBoolean().withMessage('isActive is required'),
  ],
  validate,
  userController.toggleStatus
);

// Placeholder for remaining modules
router.use((req, res) => {
  res.status(501).json({
    statusCode: 501,
    message: 'Admin endpoint not implemented yet',
    error: 'Not Implemented',
  });
});

module.exports = router;
