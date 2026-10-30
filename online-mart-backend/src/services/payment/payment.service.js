'use strict';

const mongoose = require('mongoose');
const Payment = require('../../models/Payment.model');
const Order = require('../../models/Order.model');
const gateway = require('../../infrastructure/payment/mockPayment.gateway');
const AppError = require('../../utils/AppError');
const { toString: moneyToString } = require('../../utils/money');
const { formatOrder } = require('../order/orderCreation.service');

const formatPayment = (p) => {
  const obj = p.toObject ? p.toObject() : { ...p };
  return {
    id: obj._id.toString(),
    orderId: obj.orderId.toString(),
    userId: obj.userId.toString(),
    amount: moneyToString(obj.amount),
    currency: obj.currency || 'GBP',
    status: obj.status,
    gatewayRef: obj.gatewayRef,
    gateway: obj.gateway || 'mock',
    paidAt: obj.paidAt,
    refundedAt: obj.refundedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    clientSecret: obj.metadata?.clientSecret || null,
  };
};

/**
 * Initiate payment for an order.
 * - Reuse existing UNPAID/PENDING payment if present
 * - Amount always from server (order.total)
 * - Only owner can initiate
 */
const initiate = async (userId, { orderId }) => {
  if (!orderId) throw new AppError('orderId is required', 400);

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.userId.toString() !== String(userId)) {
    throw new AppError('Order not found', 404);
  }

  if (order.status === 'CANCELLED' || order.status === 'REFUND_PENDING') {
    throw new AppError('Cannot pay for a cancelled order', 400);
  }
  if (order.paymentStatus === 'PAID') {
    throw new AppError('Order is already paid', 400);
  }
  if (order.status !== 'PENDING') {
    throw new AppError('Only PENDING orders can initiate payment', 400);
  }

  // Reuse existing pending payment
  let payment = await Payment.findOne({
    orderId: order._id,
    status: { $in: ['PENDING'] },
  });

  if (payment) {
    return formatPayment(payment);
  }

  const intent = await gateway.createIntent({
    amount: order.total,
    currency: 'GBP',
    orderId: order._id,
  });

  payment = await Payment.create({
    orderId: order._id,
    userId: order.userId,
    amount: order.total,
    currency: 'GBP',
    status: 'PENDING',
    gatewayRef: intent.gatewayRef,
    gateway: 'mock',
    metadata: {
      clientSecret: intent.clientSecret,
    },
  });

  return formatPayment(payment);
};

/**
 * Mock-complete: build signed event and process via webhook handler.
 */
const mockComplete = async (userId, paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment not found', 404);

  // Ownership
  if (payment.userId.toString() !== String(userId)) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.status === 'PAID') {
    const order = await Order.findById(payment.orderId);
    return {
      payment: formatPayment(payment),
      order: order ? formatOrder(order) : null,
      message: 'Payment already completed',
    };
  }

  if (payment.status !== 'PENDING') {
    throw new AppError(`Cannot complete payment in status ${payment.status}`, 400);
  }

  const event = gateway.buildSucceededEvent({
    gatewayRef: payment.gatewayRef,
    amount: payment.amount,
    orderId: payment.orderId,
    paymentId: payment._id,
  });

  const signature = gateway.signEvent(event);
  const webhookService = require('./webhook.service');
  const result = await webhookService.handleMockWebhook(event, signature);

  return result;
};

/**
 * Best-effort cancel of gateway intent (unpaid orders).
 */
const cancelGatewayIntent = async (orderId) => {
  const payment = await Payment.findOne({
    orderId,
    status: 'PENDING',
  });
  if (!payment || !payment.gatewayRef) return null;

  try {
    await gateway.cancelIntent(payment.gatewayRef);
    payment.status = 'CANCELLED';
    await payment.save();
    return payment;
  } catch {
    return null;
  }
};

module.exports = {
  initiate,
  mockComplete,
  cancelGatewayIntent,
  formatPayment,
};
