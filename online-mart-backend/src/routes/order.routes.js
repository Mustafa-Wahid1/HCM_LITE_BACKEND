'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const orderController = require('../controllers/order.controller');
const validate = require('../middlewares/validate.middleware');
const { requireCustomer } = require('../middlewares/roles.middleware');
const { orderLimiter } = require('../middlewares/rateLimit.middleware');

// Customer order routes
router.post(
  '/',
  requireCustomer,
  orderLimiter,
  [
    body('deliveryType')
      .notEmpty()
      .isIn(['DELIVERY', 'PICKUP'])
      .withMessage('deliveryType must be DELIVERY or PICKUP'),
    body('addressId').optional().isMongoId(),
    body('address').optional().isObject(),
    body('address.line1').optional().isString(),
    body('address.city').optional().isString(),
    body('address.postcode').optional().isString(),
    body('pickupScheduledAt').optional().isISO8601(),
  ],
  validate,
  orderController.create
);

router.get(
  '/me',
  requireCustomer,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isString(),
    query('paymentStatus').optional().isString(),
  ],
  validate,
  orderController.listMine
);

router.get(
  '/me/:id',
  requireCustomer,
  [param('id').isMongoId().withMessage('Invalid order id')],
  validate,
  orderController.getMineById
);

router.patch(
  '/me/:id/cancel',
  requireCustomer,
  orderLimiter,
  [
    param('id').isMongoId().withMessage('Invalid order id'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  orderController.cancelMine
);

module.exports = router;
