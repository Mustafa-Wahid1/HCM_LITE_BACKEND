'use strict';

const mongoose = require('mongoose');
const Payment = require('../../models/Payment.model');
const Order = require('../../models/Order.model');
const User = require('../../models/User.model');
const gateway = require('../../infrastructure/payment/mockPayment.gateway');
const AppError = require('../../utils/AppError');
const { formatPayment } = require('./payment.service');
const { formatOrder } = require('../order/orderCreation.service');
const logger = require('../../utils/logger');

/**
 * Handle mock payment webhook.
 * - Invalid signature → 400, no DB change
 * - Success: guarded update → payment PAID, order CONFIRMED, user stats +1 / +total
 * - Late payment on CANCELLED order → mark PAID then auto-refund
 * - Duplicates have one effect (idempotent)
 */
const handleMockWebhook = async (event, signature) => {
  // Verify signature first — no DB changes on failure
  const valid = gateway.verifyEvent(event, signature);
  if (!valid) {
    throw new AppError('Invalid webhook signature', 400);
  }

  if (!event || event.type !== 'payment.succeeded') {
    throw new AppError('Unsupported event type', 400);
  }

  const data = event.data || {};
  const { gatewayRef, paymentId, orderId, amount } = data;

  if (!gatewayRef && !paymentId) {
    throw new AppError('Missing gatewayRef or paymentId in event', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let payment;
    if (paymentId) {
      payment = await Payment.findById(paymentId).session(session);
    }
    if (!payment && gatewayRef) {
      payment = await Payment.findOne({ gatewayRef }).session(session);
    }
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Idempotent: already PAID
    if (payment.status === 'PAID') {
      const order = await Order.findById(payment.orderId).session(session);
      await session.commitTransaction();
      return {
        payment: formatPayment(payment),
        order: order ? formatOrder(order) : null,
        message: 'Already processed',
      };
    }

    if (payment.status === 'REFUNDED' || payment.status === 'CANCELLED') {
      await session.abortTransaction();
      throw new AppError(`Payment is ${payment.status}`, 400);
    }

    const order = await Order.findById(payment.orderId).session(session);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Amount guard
    if (amount !== undefined && Number(amount) !== Number(payment.amount)) {
      throw new AppError('Amount mismatch', 400);
    }

    // Late payment on cancelled / refund-pending order
    if (order.status === 'CANCELLED' || order.status === 'REFUND_PENDING') {
      payment.status = 'PAID';
      payment.paidAt = new Date();
      await payment.save({ session });
      await session.commitTransaction();

      // Auto-refund after commit
      const refundService = require('./refund.service');
      try {
        await refundService.refundOrder(order._id.toString(), {
          reason: 'Late payment on cancelled order',
        });
      } catch (err) {
        logger.error(
          { orderId: order._id.toString(), err: err.message },
          'Auto-refund after late payment failed'
        );
      }

      const refreshedOrder = await Order.findById(order._id);
      const refreshedPayment = await Payment.findById(payment._id);
      return {
        payment: formatPayment(refreshedPayment),
        order: formatOrder(refreshedOrder),
        message: 'Late payment recorded and auto-refund initiated',
      };
    }

    // Normal success path
    payment.status = 'PAID';
    payment.paidAt = new Date();
    await payment.save({ session });

    if (order.status === 'PENDING') {
      order.status = 'CONFIRMED';
    }
    order.paymentStatus = 'PAID';
    await order.save({ session });

    // User stats
    const user = await User.findById(order.userId).session(session);
    if (user) {
      user.totalOrders = (user.totalOrders || 0) + 1;
      user.totalSpent = Number(user.totalSpent || 0) + Number(order.total);
      await user.save({ session });
    }

    await session.commitTransaction();

    return {
      payment: formatPayment(payment),
      order: formatOrder(order),
      message: 'Payment succeeded',
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = {
  handleMockWebhook,
};
