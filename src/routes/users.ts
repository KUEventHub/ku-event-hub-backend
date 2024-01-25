import { Router } from "express";
import { checkAccessToken, checkSameUser } from "../middleware/auth.ts";
import {
  createUser,
  findUserWithId,
  findUserWithAuth0Id,
  getAuth0Id,
  findAndPopulateUser,
  updateUser,
  getProfilePictureUrl,
} from "../services/users.ts";
import { getEventTypesFromStrings } from "../services/eventtypes.ts";
import {
  registerUser,
  signOut,
  uploadProfilePicture,
} from "../services/firebase.ts";
import { encryptPassword } from "../services/bcrypt.ts";
import { ROLES } from "../helper/constants.ts";
import { toArray } from "../services/mongoose.ts";

const router = Router();

/**
 * @route post /api/users/create
 * creates a new user, saves it to the database.
 * also creates a new user in firebase.
 * base64img has a size limit of ~5mb
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - body: {
      user: {
        username: string;
        firstName: string;
        lastName: string;
        email: string;
        idCode: string;
        faculty: string;
        phoneNumber: string;
        gender: string;
        description?: string;
        profilePicture: {
          url?: string;
          base64Image?: string;
        };
        interestedEventTypes: string[];
      };
    }
 *
 * results:
 * {
      message: "User created successfully",
      id: string,
    }
 */
router.post("/create", checkAccessToken, async (req, res) => {
  // user information is sent in the body as json
  const body: {
    user: {
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      idCode: string;
      faculty: string;
      phoneNumber: string;
      gender: string;
      description?: string;
      profilePicture: {
        url?: string;
        base64Image?: string;
      };
      interestedEventTypes: string[];
    };
  } = req.body;

  try {
    // get user's access token
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);

    // get event types ids
    const eventTypes = await getEventTypesFromStrings(
      body.user.interestedEventTypes
    );

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
      profilePictureUrl: "",
      interestedEventTypes: eventTypeIds,
      auth0UserId: auth0id,
      firebaseSalt: "",
    };

    // create a user from the body
    const user = await createUser(userJson);

    // get user's password for firebase
    const passwordObject = await encryptPassword(auth0id);

    // register user to firebase
    await registerUser(userJson.email, passwordObject.password);

    let profilePictureUrl = "";

    // if profile picture is sent as url, use that
    if (body.user.profilePicture.url) {
      profilePictureUrl = body.user.profilePicture.url;
    } else if (body.user.profilePicture.base64Image) {
      // if profile picture is sent as base64 encoded image
      // upload it to firebase and use that
      profilePictureUrl = await uploadProfilePicture(
        auth0id,
        body.user.profilePicture.base64Image
      );
    } else {
      res.status(400).send({
        error: "Profile picture not found",
      });
      return;
    }

    await signOut();

    // update user
    await updateUser(user._id.toString(), {
      firebaseSalt: passwordObject.salt,
      profilePictureUrl: profilePictureUrl,
    });

    res.status(200).send({
      message: "User created successfully",
      id: user._id,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);

    res.status(400).send(e);
  }
});

/**
 * @route get /api/users/me
 * fetch sent user's information via access token
 *
 * requirements:
 * - authorization: Bearer <access_token>
 *
 * results:
 * {
      message: "User found successfully",
      user: {
        _id: string;
        username: string;
        email: string;
        profilePictureUrl: string;
      },
    }
 */
router.get("/me", checkAccessToken, async (req, res) => {
  try {
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);

    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    const userObj = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
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
 * @route get /api/users/:id
 * :id = user's _id
 * finds a user in the database and returns information
 * based on user's privacy settings
 * 
 * requirements:
 * - params: {
      id: string;
    }
 *
 * results:
 * {
      message: "User found successfully",
      user: {
        _id: string;
        username: string;
        profilePictureUrl: string;
        role: string;
        description: string;
        information: {
          show: boolean;
          // if show is true, these fields are visible
          firstName: string;
          lastName: string;
          email: string;
          idCode: string;
          faculty: string;
          gender: "other" | "male" | "female";
          phoneNumber: string;
          // if show is false, this field is visible
          message: "User information is private"";
        },
        events: {
          show: boolean;
          // if show is true, this field is visible
          events: Event[];
          // if show is false, this field is visible
          message: "User events are private"";
        },
        friends: {
          show: boolean;
          // if show is true, this field is visible
          friends: User[];
          // if show is false, this field is visible
          message: "User friends are private"";
        },
      }
    }
 */
router.get("/:id", async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // token
    const token = req.get("Authorization");
    let isSameUser: boolean;
    let auth0User;

    // find a user with id
    const user = await findUserWithId(id);

    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    if (!token) {
      isSameUser = false;
    } else {
      const auth0id = getAuth0Id(token!);

      auth0User = await findUserWithAuth0Id(auth0id);

      if (!auth0User) {
        res.status(404).send({
          error: "User not found",
        });
        return;
      }

      isSameUser = user._id.toString() === auth0User._id.toString();
    }

    // get privacy settings from user
    const showUserInformation = isSameUser || user.showUserInformation;
    const showEvents = isSameUser || user.showEvents;
    const showFriends = isSameUser || user.showFriends;

    const populatedUser = await findAndPopulateUser(id, {
      joinedEvents: showEvents,
      friends: showFriends,
    });

    const userObj = {
      // fields that are always visible
      _id: user._id,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl,
      role: user.role,
      description: user.description,
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
      events:
        showEvents && user.role === ROLES.USER
          ? {
              show: true,
              events: populatedUser.joinedEvents,
            }
          : {
              show: false,
              message: "User events are private",
            },

      // friends
      friends:
        showFriends && user.role === ROLES.USER
          ? {
              show: true,
              friends: populatedUser.friends,
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
 * @route get /api/users/:id/edit
 * :id = user's _id
 * finds a user in the database and sends information
 * to be edited
 * 
 * base64img has a size limit of ~5mb
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - user has to be the same as the user in the url
 *
 * results:
 * {
      message: "User found successfully",
      user: {
        profilePictureUrl: string;
        username: string;
        firstName: string;
        lastName: string;
        email: string;
        idCode: string;
        faculty: string;
        phoneNumber: string;
        gender: string;
        description: string;
        interestedEventTypes: any[];
      }
    }
 */
router.get("/:id/edit", checkAccessToken, checkSameUser, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // find a user with id
    const user = await findAndPopulateUser(id, {
      interestedEventTypes: true,
    });

    const interestedEventTypes = toArray(user.interestedEventTypes);

    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    const userJson = {
      profilePictureUrl: user.profilePictureUrl,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      idCode: user.idCode,
      faculty: user.faculty,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      description: user.description,
      interestedEventTypes: interestedEventTypes.map(
        (eventType) => eventType.name
      ),
    };

    res.status(200).send({
      message: "User found successfully",
      user: userJson,
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
 * base64img has a size limit of ~5mb
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
        profilePicture?: {
          url?: string;
          base64Image?: string;
        };
        interestedEventTypes?: string[];
      };
    }
 * - user has to be the same as the user in the url
 *
 * results:
 * {
      message: "User updated successfully",
    }
 */
router.post("/:id/edit", checkAccessToken, checkSameUser, async (req, res) => {
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
      profilePicture?: {
        url?: string;
        base64Image?: string;
      };
      gender?: string;
      description?: string;
      interestedEventTypes?: string[];
    };
  } = req.body;

  try {
    // find a user with id
    const user = await findUserWithId(id);

    if (!user) {
      res.status(404).send({
        error: "User not found",
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

    const userJson: any = {
      username: body.user.username,
      firstName: body.user.firstName,
      lastName: body.user.lastName,
      idCode: body.user.idCode,
      faculty: body.user.faculty,
      phoneNumber: body.user.phoneNumber,
      gender: body.user.gender,
      description: body.user.description,
    };

    if (eventTypeIds.length > 0) {
      userJson.interestedEventTypes = eventTypeIds;
    }

    let profilePictureUrl = body.user.profilePicture
      ? await getProfilePictureUrl(body.user.profilePicture, id)
      : undefined;

    if (profilePictureUrl) {
      userJson.profilePictureUrl = profilePictureUrl;
    }

    await user.updateOne(userJson);

    res.status(200).send({
      message: "User updated successfully",
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as userRouter };
