'use strict';

const crypto = require('crypto');
const env = require('../../config/env');

/**
 * Mock payment gateway behind a stable interface.
 * Methods: createIntent, cancelIntent, refund, signEvent, verifyEvent
 */
class MockPaymentGateway {
  constructor(webhookSecret = env.PAYMENT_WEBHOOK_SECRET) {
    this.webhookSecret = webhookSecret;
  }

  /**
   * Create a payment intent. Returns gateway reference + client payload.
   */
  async createIntent({ amount, currency = 'GBP', orderId, metadata = {} }) {
    const gatewayRef = `mock_pi_${crypto.randomBytes(12).toString('hex')}`;
    return {
      gatewayRef,
      amount: Number(amount),
      currency,
      status: 'requires_payment',
      clientSecret: `${gatewayRef}_secret`,
      metadata: { orderId: String(orderId), ...metadata },
    };
  }

  /**
   * Cancel an unpaid intent.
   */
  async cancelIntent(gatewayRef) {
    return {
      gatewayRef,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
  }

  /**
   * Refund a paid payment.
   */
  async refund({ gatewayRef, amount, reason = 'requested_by_customer' }) {
    const refundId = `mock_re_${crypto.randomBytes(10).toString('hex')}`;
    return {
      refundId,
      gatewayRef,
      amount: Number(amount),
      status: 'succeeded',
      reason,
      refundedAt: new Date().toISOString(),
    };
  }

  /**
   * Sign an event payload with HMAC-SHA256.
   */
  signEvent(payload) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', this.webhookSecret).update(body).digest('hex');
  }

  /**
   * Verify event signature using timing-safe comparison.
   */
  verifyEvent(payload, signature) {
    if (!signature || typeof signature !== 'string') return false;
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = this.signEvent(body);
    try {
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(signature, 'utf8');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Build a mock payment.succeeded event (used by mock-complete).
   */
  buildSucceededEvent({ gatewayRef, amount, orderId, paymentId }) {
    return {
      id: `evt_${crypto.randomBytes(8).toString('hex')}`,
      type: 'payment.succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        gatewayRef,
        amount: Number(amount),
        currency: 'GBP',
        orderId: String(orderId),
        paymentId: String(paymentId),
        status: 'succeeded',
      },
    };
  }
}

const gateway = new MockPaymentGateway();

module.exports = gateway;
module.exports.MockPaymentGateway = MockPaymentGateway;
