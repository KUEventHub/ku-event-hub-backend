import mongoose, { Schema, model } from "mongoose";
import { EMAIL_REGEX, FACULTY_LIST } from "../helper/constants.ts";
import {
  getInvalidValueString,
  getMaximumLengthString,
  getMinimumLengthString,
  getMissingAttributeString,
} from "../helper/schemaErrors.ts";

const schema = new Schema({
  // user information
  role: {
    type: String,
    enum: {
      values: ["user", "admin"],
      message: getInvalidValueString("role"),
    },
    default: "user",
  },
  username: {
    type: String,
    required: [true, getMissingAttributeString("username")],
    min: [4, getMinimumLengthString("username", 4)],
    max: [15, getMaximumLengthString("username", 15)],
  },
  firstName: {
    type: String,
    default: "",
  },
  lastName: {
    type: String,
    default: "",
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
    default: "none",
    enum: {
      values: [...FACULTY_LIST, "none", "other"],
      message: getInvalidValueString("faculty"),
    },
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  gender: {
    type: String,
    default: "other",
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
    type: Array<mongoose.Types.ObjectId>,
    default: [],
  },
  joinedEvents: {
    // events user have joined
    // `Participation` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: [],
  },
  friends: {
    // friends user have
    // `User` ObjectId
    type: Array<mongoose.Types.ObjectId>,
    default: [],
  },
  // receivedFriendRequests: {
  //   // friend requests user received
  //   // `FriendRequest` ObjectId
  //   type: Array<mongoose.Types.ObjectId>,
  //   default: [],
  // },
  // sentFriendRequests: {
  //   // friend requests user sent
  //   // `FriendRequest` ObjectId
  //   type: Array<mongoose.Types.ObjectId>,
  //   default: [],
  // },
  ban: {
    // ban status
    // `BanLog` ObjectId
    type: mongoose.Types.ObjectId,
    default: null,
  },
});

const User = model("users", schema);

export default User;
