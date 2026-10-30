'use strict';

const mongoose = require('mongoose');
const Address = require('../models/Address.model');
const AppError = require('../utils/AppError');

const list = async (userId) => {
  const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
  return addresses.map(format);
};

const getById = async (userId, id) => {
  const address = await Address.findOne({ _id: id, userId }).lean();
  if (!address) throw new AppError('Address not found', 404);
  return format(address);
};

const create = async (userId, data) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const count = await Address.countDocuments({ userId }).session(session);
    const isDefault = count === 0 ? true : Boolean(data.isDefault);

    if (isDefault && count > 0) {
      await Address.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    const [address] = await Address.create(
      [
        {
          userId,
          label: data.label || 'Home',
          line1: data.line1,
          line2: data.line2 || '',
          city: data.city,
          postcode: data.postcode,
          country: data.country || 'GB',
          isDefault,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return format(address.toObject());
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const update = async (userId, id, data) => {
  const address = await Address.findOne({ _id: id, userId });
  if (!address) throw new AppError('Address not found', 404);

  const fields = ['label', 'line1', 'line2', 'city', 'postcode', 'country'];
  fields.forEach((f) => {
    if (data[f] !== undefined) address[f] = data[f];
  });
  await address.save();
  return format(address.toObject());
};

const remove = async (userId, id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const address = await Address.findOne({ _id: id, userId }).session(session);
    if (!address) throw new AppError('Address not found', 404);

    const wasDefault = address.isDefault;
    await address.deleteOne({ session });

    if (wasDefault) {
      const next = await Address.findOne({ userId })
        .sort({ createdAt: -1 })
        .session(session);
      if (next) {
        next.isDefault = true;
        await next.save({ session });
      }
    }

    await session.commitTransaction();
    return { message: 'Address deleted' };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const setDefault = async (userId, id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const address = await Address.findOne({ _id: id, userId }).session(session);
    if (!address) throw new AppError('Address not found', 404);

    await Address.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } },
      { session }
    );
    address.isDefault = true;
    await address.save({ session });

    await session.commitTransaction();
    return format(address.toObject());
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const format = (a) => ({
  id: a._id.toString(),
  label: a.label,
  line1: a.line1,
  line2: a.line2,
  city: a.city,
  postcode: a.postcode,
  country: a.country,
  isDefault: a.isDefault,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  setDefault,
};
