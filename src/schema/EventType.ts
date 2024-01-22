import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schemaErrors.ts";
import { TABLES } from "../helper/constants.ts";

const schema = new Schema({
  name: {
    type: String,
    required: [true, getMissingAttributeString("name")],
  },
  childTypes: {
    type: Array<mongoose.Types.ObjectId>,
    ref: TABLES.EVENT_TYPE,
    default: [],
  },
});

const EventType = model(TABLES.EVENT_TYPE, schema);

export default EventType;
