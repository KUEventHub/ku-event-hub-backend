import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schemaErrors.ts";
import { TABLES } from "../helper/constants.ts";

const schema = new Schema({
  time: {
    // the time the user logged in
    type: Date,
    default: Date.now,
  },

  // references
  user: {
    // the user that logged in
    // `User` ObjectId
    type: mongoose.Types.ObjectId,
    required: [true, getMissingAttributeString("user")],
    ref: TABLES.USER,
  },
});

const LoginLog = model(TABLES.LOGIN_LOG, schema);

export default LoginLog;
