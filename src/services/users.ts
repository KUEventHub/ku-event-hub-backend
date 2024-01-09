import { jwtDecode } from "jwt-decode";
import User from "../schema/User.ts";
import { ObjectId } from "mongodb";

/**
 * Creates a new user, saves it to the database
 * and returns the user object.
 * @param user user information
 * @returns `User` object
 */
export async function createUser(user: {
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  idCode?: string;
  faculty?: string;
  phoneNumber?: string;
  gender?: string;
  description?: string;
  profilePictureUrl: string;
  interestedEventTypes?: ObjectId[];
  auth0UserId?: string;
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
export function getUserAuth0Id(accessToken: string) {
  const decodedToken = jwtDecode(accessToken);
  const sub = decodedToken.sub;

  if (!sub) {
    throw new Error("Invalid token");
  }

  const id = sub.split("|")[1];

  return id;
}

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
    interestedEventTypes?: string[];
  }
) {
  // find a user with id
  const foundUser = await User.findByIdAndUpdate(id, user);

  return foundUser;
}
