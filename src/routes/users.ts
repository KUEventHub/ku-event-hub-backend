import { Router } from "express";
import { checkJwt } from "../services/auth.ts";
import {
  createUser,
  findUserWithId,
  findUserWithAuth0Id,
  getUserAuth0Id,
} from "../services/users.ts";
import { getEventTypesFromStrings } from "../services/eventtypes.ts";

const router = Router();

/**
 * @route post /api/users/create
 * creates a new user, saves it to the database
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - body: {
      user: {
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
        interestedEventTypes?: string[];
        auth0UserId: string;
      };
    }
 *
 * results:
 * - 200: {message, id}
 * - 400: {error}
 */
router.post("/create", checkJwt, async (req, res) => {
  // user information is sent in the body as json
  const body: {
    user: {
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
      interestedEventTypes?: string[];
      auth0UserId?: string;
    };
  } = req.body;

  try {
    // get user's access token
    const token = req.get("Authorization");
    const auth0id = getUserAuth0Id(token!);

    // get event types ids
    const eventTypes = body.user.interestedEventTypes
      ? await getEventTypesFromStrings(body.user.interestedEventTypes)
      : [];

    const eventTypeIds =
      eventTypes.length > 0
        ? eventTypes.map((eventType) => eventType!._id)
        : [];

    const userJson = {
      username: body.user.username,
      firstName: body.user.firstName,
      lastName: body.user.lastName,
      email: body.user.email,
      idCode: body.user.idCode,
      faculty: body.user.faculty,
      phoneNumber: body.user.phoneNumber,
      gender: body.user.gender,
      description: body.user.description,
      profilePictureUrl: body.user.profilePictureUrl,
      interestedEventTypes: eventTypeIds,
      auth0UserId: auth0id,
    };

    console.log(userJson);

    // create a user from the body
    const user = await createUser(userJson);

    res.status(200).send({
      message: "User created successfully",
      id: user._id,
    });
  } catch (e: any) {
    // handle errors
    console.log(e);

    res.status(400).send(e);
  }
});

/**
 * @route get /api/users/:id
 *
 * :id = user's _id
 * finds a user in the database and returns information
 * based on user's privacy settings
 *
 * results:
 * - 200: {message, user: {username, profilePictureUrl, information, events, friends}}
 * (information, events, friends has field `show`)
 * that is either true or false depending on privacy settings
 */
router.get("/:id", async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // find a user with id
    const user = await findUserWithId(id);

    if (!user) {
      throw new Error("User not found");
    }

    // get privacy settings from user
    const showUserInformation = user.showUserInformation;
    const showEvents = user.showEvents;
    const showFriends = user.showFriends;

    if (showEvents) {
      await user.populate("joinedEvents");
    }

    if (showFriends) {
      await user.populate("friends");
    }

    const userObj = {
      // fields that are always visible
      _id: user._id,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl,

      // fields that are visible depending on privacy settings
      // user information
      information: showUserInformation
        ? {
            show: true,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            idCode: user.idCode,
            faculty: user.faculty,
            gender: user.gender,
            phoneNumber: user.phoneNumber,
          }
        : {
            show: false,
            message: "User information is private",
          },

      // events
      events: showEvents
        ? {
            show: true,
            events: user.joinedEvents,
          }
        : {
            show: false,
            message: "User events are private",
          },

      // friends
      friends: showFriends
        ? {
            show: true,
            friends: user.friends,
          }
        : {
            show: false,
            message: "User friends are private",
          },
    };

    res.status(200).send({
      message: "User found successfully",
      user: userObj,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/users/:id/edit
 * :id = user's _id
 * finds a user in the database and edits it
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - body: {
      user: {
        username?: string;
        firstName?: string;
        lastName?: string;
        idCode?: string;
        faculty?: string;
        phoneNumber?: string;
        gender?: string;
        description?: string;
        interestedEventTypes?: string[];
      };
    }
 * - user has to be the same as the user in the url
 *
 * results:
 * - 200: {message}
 */
router.post("/:id/edit", checkJwt, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  const body: {
    user: {
      username?: string;
      firstName?: string;
      lastName?: string;
      idCode?: string;
      faculty?: string;
      phoneNumber?: string;
      gender?: string;
      description?: string;
      interestedEventTypes?: string[];
    };
  } = req.body;

  try {
    // get user's auth0 id
    const token = req.get("Authorization");
    const auth0id = getUserAuth0Id(token!);
    const auth0user = await findUserWithAuth0Id(auth0id);

    // if there's no user with auth0 id, respond with error
    if (!auth0user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // if user is not the same as the user in the url, respond with error
    if (auth0user._id.toString() !== id) {
      res.status(401).send({
        error: "Unauthorized",
      });
      return;
    }

    // get event types ids
    const eventTypes = body.user.interestedEventTypes
      ? await getEventTypesFromStrings(body.user.interestedEventTypes)
      : [];

    const eventTypeIds =
      eventTypes.length > 0
        ? eventTypes.map((eventType) => eventType!._id)
        : [];

    const userJson = {
      username: body.user.username,
      firstName: body.user.firstName,
      lastName: body.user.lastName,
      idCode: body.user.idCode,
      faculty: body.user.faculty,
      phoneNumber: body.user.phoneNumber,
      gender: body.user.gender,
      description: body.user.description,
      interestedEventTypes: eventTypeIds,
    };

    await auth0user.updateOne(userJson);

    res.status(200).send({
      message: "User updated successfully",
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/users/:id/upload-profile-picture
 * :id = user's _id
 * finds a user in the database and uploads a profile picture
 * not finished though
 */
router.post("/:id/upload-profile-picture", checkJwt, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  const body: {
    user: {
      profilePicture: string;
    };
  } = req.body;

  try {
    // get user's auth0 id
    const token = req.get("Authorization");
    const auth0id = getUserAuth0Id(token!);
    const auth0user = await findUserWithAuth0Id(auth0id);

    // if there's no user with auth0 id, respond with error
    if (!auth0user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // if user is not the same as the user in the url, respond with error
    if (auth0user._id.toString() !== id) {
      res.status(401).send({
        error: "Unauthorized",
      });
      return;
    }

    // todo: login firebase to get authorization
    // upload profile picture to firebase
    // get the profile picture's link

    res.status(200).send({
      message: "User updated successfully",
      profilePictureUrl: body.user.profilePicture,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as userRouter };
