'use strict';

const cron = require('node-cron');
const Order = require('../models/Order.model');
const { cancelByTimeout } = require('../services/order/orderCancellation.service');
const logger = require('../utils/logger');

const BATCH_SIZE = 50;

/**
 * Payment timeout cron — every minute.
 * Finds PENDING orders with paymentExpiresAt < now (max 50).
 * Cancels via cancelByTimeout (PAYMENT_TIMEOUT).
 * Silently skips conflicts / already-cancelled.
 */
const processExpiredPayments = async () => {
  const now = new Date();
  let processed = 0;
  let cancelled = 0;
  let skipped = 0;

  try {
    const expired = await Order.find({
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentExpiresAt: { $lte: now },
    })
      .sort({ paymentExpiresAt: 1 })
      .limit(BATCH_SIZE)
      .select('_id orderNumber paymentExpiresAt')
      .lean();

    if (expired.length === 0) return;

    logger.info({ count: expired.length }, 'Payment timeout: processing expired orders');

    for (const order of expired) {
      processed += 1;
      try {
        const result = await cancelByTimeout(order._id.toString());
        if (result && result.skipped) {
          skipped += 1;
        } else if (result && result.alreadyCancelled) {
          skipped += 1;
        } else {
          cancelled += 1;
          // Best-effort gateway cancel for unpaid
          try {
            const paymentService = require('../services/payment/payment.service');
            await paymentService.cancelGatewayIntent(order._id.toString());
          } catch (err) {
            logger.warn(
              { orderId: order._id.toString(), err: err.message },
              'Gateway cancel after timeout failed'
            );
          }
        }
      } catch (err) {
        // Skip 409-style / operational conflicts silently
        if (err.statusCode === 400 || err.statusCode === 404 || err.statusCode === 409) {
          skipped += 1;
          logger.warn(
            { orderId: order._id.toString(), err: err.message },
            'Payment timeout cancel skipped'
          );
        } else {
          logger.error(
            { orderId: order._id.toString(), err: err.message },
            'Payment timeout cancel failed'
          );
        }
      }
    }

    logger.info({ processed, cancelled, skipped }, 'Payment timeout batch complete');
  } catch (err) {
    logger.error({ err: err.message }, 'Payment timeout job failed');
  }
};

let task = null;

const start = () => {
  if (task) return task;
  // Every minute
  task = cron.schedule('* * * * *', () => {
    processExpiredPayments().catch((err) => {
      logger.error({ err: err.message }, 'Unhandled payment timeout error');
    });
  });
  logger.info('Payment timeout cron started (every minute)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
    logger.info('Payment timeout cron stopped');
  }
};

module.exports = {
  start,
  stop,
  processExpiredPayments,
};
