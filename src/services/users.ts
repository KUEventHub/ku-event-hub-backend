import User from "../schema/User.ts";

/**
 * Creates a new user, saves it to the database
 * and returns the user object.
 * @param user user information
 * @returns `User` object
 */
export async function createUser(user: {
  username?: string;
  email?: string;
  profilePictureUrl?: string;
}) {
  // create a new user object
  const createdUser = new User({
    username: user.username,
    email: user.email,
    profilePictureUrl: user.profilePictureUrl,
  });

  // save the user to the database
  await createdUser.save();

  return createdUser;
}

/**
 * Finds a user in the database and returns it.
 * @param id user id
 * @returns `User` object
 */
export async function findUser(id: string) {
  // find a user with id
  const foundUser = await User.findById(id);

  return foundUser;
}
