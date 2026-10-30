'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/user.controller');
const validate = require('../middlewares/validate.middleware');

router.get('/me/stats', userController.getStats);

router.patch(
  '/me',
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('phone').optional({ nullable: true }).isString(),
  ],
  validate,
  userController.updateMe
);

router.delete('/me', userController.deleteMe);

module.exports = router;
