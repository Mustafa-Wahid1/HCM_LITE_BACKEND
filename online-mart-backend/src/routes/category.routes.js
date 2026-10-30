'use strict';

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: List active categories (public, nested)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Nested list of active categories
 */
router.get('/', categoryController.listPublic);

module.exports = router;
