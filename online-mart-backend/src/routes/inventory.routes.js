'use strict';

const express = require('express');
const router = express.Router();

// Stub - implemented in later phases
router.use((req, res) => res.status(501).json({ message: 'Not implemented yet' }));

module.exports = router;
