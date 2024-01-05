import { Router } from "express";
import { checkJwt } from "../services/auth0.ts";
import { createUser, findUser } from "../services/users.ts";

const router = Router();

/**
 * @route post /users/create
 * creates a new user, saves it to the database
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - body: {user: {username, email, profilePictureUrl}}
 *
 * results:
 * - 200: {message, id}
 * - 400: {error}
 */
router.post("/create", checkJwt, async (req, res) => {
  // user information is sent in the body as json
  const body: {
    user: {
      username?: string;
      email?: string;
      profilePictureUrl?: string;
    };
  } = req.body;

  try {
    // create a user from the body
    const user = await createUser(body.user);

    // does nothing with it for now
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
 * @route get /users/:id
 * finds a user in the database and returns information
 * based on user's privacy settings
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - body: {}
 *
 * results:
 * - 200: {message, user: {username, profilePictureUrl, information, events, friends}}
 * (information, events, friends has field `show`)
 * that is either true or false depending on privacy settings
 * - 400: {error}
 */
router.get("/:id", checkJwt, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // find a user with id
    const user = await findUser(id);

    if (!user) {
      throw new Error("User not found");
    }

    // get privacy settings from user
    const showUserInformation = user.showUserInformation;
    const showEvents = user.showEvents;
    const showFriends = user.showFriends;

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
    res.status(400).send(e);
  }
});

// update user
router.post("/:id/edit", checkJwt, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  const user = await findUser(id);
});

export { router as userRouter };
