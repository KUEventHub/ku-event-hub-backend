import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schema.ts";

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

  // references
  bannedUser: {
    // the user who is banned
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("bannedUser")],
  },
  bannedBy: {
    // the user (admin) who banned this user
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("bannedBy")],
  },
});

const BanLog = model("banLogs", schema);

export default BanLog;
