import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schema.ts";

const schema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isConfirmed: {
    // whether the participation is confirmed or not
    type: Boolean,
    default: false,
  },

  // references
  event: {
    // the event related to this participation
    // `Event` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("event")],
  },
  user: {
    // the user related to this participation
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("user")],
  },
});

const Participation = model("participations", schema);

export default Participation;
