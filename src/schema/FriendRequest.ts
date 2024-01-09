import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schemaErrors.ts";
import { TABLES } from "../helper/constants.ts";

const schema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isResponded: {
    // whether the friend request is responded or not
    type: Boolean,
    default: false,
  },
  isAccepted: {
    // whether the friend request is accepted or not
    type: Boolean,
    default: null,
  },

  // references
  from: {
    // the user who sent the friend request
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("from")],
    ref: TABLES.USER,
  },
  to: {
    // the user who received the friend request
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("to")],
    ref: TABLES.USER,
  },
});

const FriendRequest = model(TABLES.FRIEND_REQUEST, schema);

export default FriendRequest;
