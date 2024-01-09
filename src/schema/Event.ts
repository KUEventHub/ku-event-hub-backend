import mongoose, { Schema, model } from "mongoose";
import {
  getMinimumValueString,
  getMissingAttributeString,
} from "../helper/schemaErrors.ts";
import { TABLES } from "../helper/constants.ts";

const schema = new Schema({
  name: {
    type: String,
    required: [true, getMissingAttributeString("name")],
  },
  imageUrl: {
    type: String,
    required: [true, getMissingAttributeString("imageUrl")],
  },
  activityHours: {
    type: Number,
    required: [true, getMissingAttributeString("activityHours")],
  },
  totalSeats: {
    type: Number,
    required: [true, getMissingAttributeString("totalSeats")],
    min: [1, getMinimumValueString("totalSeats", 1)],
  },
  startTime: {
    type: Date,
    required: [true, getMissingAttributeString("startTime")],
  },
  endTime: {
    type: Date,
    required: [true, getMissingAttributeString("endTime")],
  },
  location: {
    type: String,
    required: [true, getMissingAttributeString("location")],
  },
  description: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // qr code string for scanning
  // and confirming participation
  qrCodeString: {
    type: String,
    default: null,
  },

  // references
  createdBy: {
    // the user (with admin role) that created this event
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    default: null,
    ref: TABLES.USER,
  },
  joinedUsers: {
    // users that joined this event
    // `Participation` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: null,
    ref: TABLES.PARTICIPATION,
  },
  eventTypes: {
    // event types of this event
    // `EventType` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: null,
    ref: TABLES.EVENT_TYPE,
  },
});

const Event = model(TABLES.EVENT, schema);

export default Event;
