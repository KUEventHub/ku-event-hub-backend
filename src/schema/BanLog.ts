import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schemaErrors.ts";
import { TABLES } from "../helper/constants.ts";

const schema = new Schema({
  time: {
    // the time when the ban was made
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    required: [true, getMissingAttributeString("reason")],
  },
  isActive: {
    // whether the ban is active or not
    type: Boolean,
    default: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    // the time when the ban will expire
    type: Date,
    required: [true, getMissingAttributeString("expiresAt")],
  },

  // references
  bannedUser: {
    // the user who is banned
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("bannedUser")],
    ref: TABLES.USER,
  },
  bannedBy: {
    // the user (admin) who banned this user
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("bannedBy")],
    ref: TABLES.USER,
  },
});

const BanLog = model(TABLES.BAN_LOG, schema);

export default BanLog;
