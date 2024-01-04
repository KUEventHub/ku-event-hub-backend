import { ObjectId, Schema, model } from "mongoose";
import { EMAIL_REGEX, FACULTY_LIST } from "../helper/constants.ts";
import {
  getDuplicateValueString,
  getInvalidValueString,
  getMaximumLengthString,
  getMinimumLengthString,
  getMissingAttributeString,
} from "../helper/schema.ts";

const schema = new Schema({
  // user information
  role: {
    type: String,
    required: [true, getMissingAttributeString("role")],
    enum: {
      values: ["user", "admin"],
      message: getInvalidValueString("role"),
    },
  },
  username: {
    type: String,
    unique: [true, getDuplicateValueString("username")],
    required: [true, getMissingAttributeString("username")],
    min: [4, getMinimumLengthString("username", 4)],
    max: [15, getMaximumLengthString("username", 15)],
  },
  firstName: {
    type: String,
    required: [true, getMissingAttributeString("firstName")],
    min: [1, getMinimumLengthString("firstName", 1)],
  },
  lastName: {
    type: String,
    required: [true, getMissingAttributeString("lastName")],
  },
  email: {
    type: String,
    match: [EMAIL_REGEX, getInvalidValueString("email")],
    required: [true, getMissingAttributeString("email")],
  },
  idCode: {
    type: String,
    default: "",
  },
  faculty: {
    type: String,
    required: [true, getMissingAttributeString("faculty")],
    enum: {
      values: [...FACULTY_LIST, "other"],
      message: getInvalidValueString("faculty"),
    },
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  gender: {
    type: String,
    required: [true, getMissingAttributeString("gender")],
    enum: {
      values: ["male", "female", "other"],
      message: getInvalidValueString("gender"),
    },
  },
  description: {
    type: String,
    default: "",
  },
  profilePictureUrl: {
    // profile picture url
    type: String,
    required: [true, getMissingAttributeString("profilePicture")],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },

  // user privacy
  showFriends: {
    // show your friend list to other people
    type: Boolean,
    default: true,
  },
  showEvents: {
    // show your joined events to other people
    type: Boolean,
    default: true,
  },
  showUserInformation: {
    // show your user information to other people
    type: Boolean,
    default: true,
  },

  // references
  interestedEventTypes: {
    // event types user are interested in
    // `EventType` ObjectId
    type: Array<ObjectId>,
    default: [],
  },
  joinedEvents: {
    // events user have joined
    // `Participation` ObjectId
    type: Array<ObjectId>,
    default: [],
  },
});

const User = model("users", schema);

export default User;
