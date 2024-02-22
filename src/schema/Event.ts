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
    default: "",
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
    // whether this event is active (can be participated)
    type: Boolean,
    default: true,
  },
  isDeactivated: {
    // whether this event has been deactivated
    // (hidden from main page)
    type: Boolean,
    default: false,
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
  // qr code iv
  qrCodeIv: {
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
  participants: {
    // users that joined this event
    // `Participation` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: [],
    ref: TABLES.PARTICIPATION,
  },
  eventTypes: {
    // event types of this event
    // `EventType` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: [],
    ref: TABLES.EVENT_TYPE,
  },
});

const Event = model(TABLES.EVENT, schema);

export default Event;
