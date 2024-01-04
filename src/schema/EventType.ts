import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schema.ts";

const schema = new Schema({
  name: {
    type: String,
    required: [true, getMissingAttributeString("name")],
  },

  // references
  parentType: {
    // the parent type of this event type
    // `EventType` ObjectId
    type: mongoose.Types.ObjectId,
    default: null,
  },
  childTypes: {
    // the child types of this event type
    // `EventType` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: [],
  },
});

const EventType = model("eventTypes", schema);

export default EventType;
