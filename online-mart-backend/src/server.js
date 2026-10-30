'use strict';

const env = require('./config/env');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const app = require('./app');

const start = async () => {
  await connectDB();

  // Crons — skip in test environment
  let paymentTimeoutCron = null;
  let refundRetryCron = null;
  if (!env.isTest) {
    paymentTimeoutCron = require('./jobs/paymentTimeout.cron');
    refundRetryCron = require('./jobs/refundRetry.cron');
    paymentTimeoutCron.start();
    refundRetryCron.start();
  }

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, prefix: env.URL_PREFIX },
      'OnlineMart backend started'
    );
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down');
    if (paymentTimeoutCron) paymentTimeoutCron.stop();
    if (refundRetryCron) refundRetryCron.stop();
    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
        process.exit(0);
      } catch (err) {
        logger.error({ err: err.message }, 'Error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error({ err: err.message }, 'Failed to start server');
  process.exit(1);
});
