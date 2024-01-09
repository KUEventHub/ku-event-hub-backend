import { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schemaErrors.ts";
import { TABLES } from "../helper/constants.ts";

const schema = new Schema({
  name: {
    type: String,
    required: [true, getMissingAttributeString("name")],
  },
});

const EventType = model(TABLES.EVENT_TYPE, schema);

export default EventType;
