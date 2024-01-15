import { jwtDecode } from "jwt-decode";
import User from "../schema/User.ts";
import { ObjectId } from "mongodb";
import { encryptPassword } from "./bcrypt.ts";
import { signIn, signOut, uploadProfilePicture } from "./firebase.ts";

/**
 * Creates a new user, saves it to the database
 * and returns the user object.
 * @param user user information
 * @returns `User` object
 */
export async function createUser(user: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  idCode: string;
  faculty: string;
  phoneNumber: string;
  gender: string;
  description?: string;
  profilePictureUrl?: string;
  interestedEventTypes?: ObjectId[];
  auth0UserId: string;
}) {
  // create a new user object
  const createdUser = new User(user);

  // save the user to the database
  await createdUser.save();

  return createdUser;
}

/**
 * Finds a user in the database and returns it.
 * @param id user id (ObjectId)
 * @returns `User` object
 */
export async function findUserWithId(id: string) {
  // find a user with id
  const foundUser = await User.findById(id);

  return foundUser;
}

/**
 * Finds a user in the database and returns it.
 * @param auth0Id user auth0id
 * @returns `User` object
 */
export async function findUserWithAuth0Id(auth0Id: string) {
  // find a user with id
  const foundUser = await User.findOne({ auth0UserId: auth0Id });

  return foundUser;
}

/**
 * Returns the user's Auth0 ID from the access token.
 *
 * @param accessToken user's access token
 * @returns user's auth0 id
 */
export function getAuth0Id(accessToken: string) {
  const decodedToken = jwtDecode(accessToken);
  const sub = decodedToken.sub;

  if (!sub) {
    throw new Error("Invalid token");
  }

  const id = sub.split("|")[1];

  return id;
}

/**
 * Updates a user in the database and returns it.
 *
 * @param id user id (ObjectId)
 * @param user user information
 * @returns `User` object
 */
export async function updateUser(
  id: string,
  user: {
    username?: string;
    firstName?: string;
    lastName?: string;
    idCode?: string;
    faculty?: string;
    phoneNumber?: string;
    gender?: string;
    description?: string;
    profilePictureUrl?: string;
    showFriends?: boolean;
    showEvents?: boolean;
    showUserInformation?: boolean;
    interestedEventTypes?: ObjectId[];
    joinedEvents?: ObjectId[];
    friends?: ObjectId[];
    ban?: ObjectId;
    firebaseSalt?: string;
  }
) {
  const userJson = {
    ...user,
    updatedAt: Date.now(),
  };
  // find a user with id
  const foundUser = await User.findByIdAndUpdate(id, userJson);

  return foundUser;
}

/**
 * Finds a user in the database and returns it.
 * Populates the user with the given options.
 *
 * @param id user id
 * @param options options for populating the user
 * @returns `User` object (populater as per option)
 */
export async function findAndPopulateUser(
  id: string,
  options: {
    interestedEventTypes?: boolean;
    joinedEvents?: boolean;
    friends?: boolean;
    ban?: boolean;
  }
) {
  const user = await findUserWithId(id);

  if (!user) {
    throw new Error("User not found");
  }

  if (options.interestedEventTypes) {
    await user.populate("interestedEventTypes");
  }
  if (options.joinedEvents) {
    await user.populate("joinedEvents");
  }
  if (options.friends) {
    await user.populate("friends");
  }
  if (options.ban) {
    await user.populate("ban");
  }

  return user;
}

export async function getProfilePictureUrl(
  profilePicture: { url?: string; base64Image?: string },
  userId: string
) {
  // get user
  const user = await findUserWithId(userId);

  if (!user) {
    throw new Error("User not found");
  }

  let profilePictureUrl: string | undefined = undefined;

  // if profile picture is sent as url, use that
  if (profilePicture.url) {
    profilePictureUrl = profilePicture.url;
  } else if (profilePicture.base64Image) {
    // if profile picture is sent as base64 encoded image
    // upload it to firebase and use that
    const passwordObj = await encryptPassword(
      user.auth0UserId,
      user.firebaseSalt
    );
    await signIn(user.email, passwordObj.password);
    profilePictureUrl = await uploadProfilePicture(
      user.auth0UserId,
      profilePicture.base64Image
    );
    await signOut();
  }

  return profilePictureUrl;
}
