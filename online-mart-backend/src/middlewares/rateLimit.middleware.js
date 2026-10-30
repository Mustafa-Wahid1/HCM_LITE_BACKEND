'use strict';

const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many requests, please try again later.',
    error: 'Too Many Requests',
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many authentication attempts, please try again later.',
    error: 'Too Many Requests',
  },
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many order requests, please try again later.',
    error: 'Too Many Requests',
  },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many payment initiation attempts, please try again later.',
    error: 'Too Many Requests',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  orderLimiter,
  paymentLimiter,
};
