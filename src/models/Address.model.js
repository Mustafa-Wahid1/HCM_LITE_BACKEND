'use strict';

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'Home',
    },
    line1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    line2: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    postcode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    country: {
      type: String,
      default: 'GB',
      maxlength: 2,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

addressSchema.index({ userId: 1, isDefault: 1 });
addressSchema.index(
  { userId: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  }
);

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
