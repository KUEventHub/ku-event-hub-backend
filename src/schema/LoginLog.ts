import mongoose, { Schema, model } from "mongoose";
import { getMissingAttributeString } from "../helper/schemaErrors.ts";

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
  },
});

const LoginLog = model("loginLogs", schema);

export default LoginLog;
