import { Router } from "express";
import {
  checkAccessToken,
  checkAdminRole,
  checkSameUser,
  checkUserBan,
  checkUserRole,
} from "../middleware/auth.ts";
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
import { encryptPassword } from "../helper/crypto.ts";
import { ROLES } from "../helper/constants.ts";
import { toArray } from "../services/mongoose.ts";
import { findEventWithId } from "../services/events.ts";
import LoginLog from "../schema/LoginLog.ts";
import BanLog from "../schema/BanLog.ts";
import User from "../schema/User.ts";

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
router.get("/me", checkAccessToken, checkUserBan, async (req, res) => {
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
 * @route post /api/users/login
 * send a login log to the database
 *
 * requirements:
 * - authorization: Bearer <access_token>
 *
 * results:
 * {
      message: "User login logged successfully",
    }
 */
router.post("/login", checkAccessToken, checkUserBan, async (req, res) => {
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

    const loginLog = new LoginLog({
      user: user._id,
    });

    await loginLog.save();

    res.status(200).send({
      message: "User login logged successfully",
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
        privacySettings: {
          // if user is the same user in url, show these
            showUserInformation: boolean,
            showEvents: boolean,
            showFriends: boolean,
          // otherwise, privacySettings = undefined (if sent, at all)
        },
        friendsInformation: {
          // if user is logged in, and is not the same user as the user in the url
          // show these
          isFriend: boolean,
          hasOutgoingFriendRequest: boolean,
          hasReceivedFriendRequest: boolean,
          // otherwise, friendsInformation = undefined (if sent, at all)
        }
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
    let isAdmin: boolean;
    let isLoggedIn: boolean;
    let isFriend: boolean;
    let hasOutgoingFriendRequest: boolean; // check if logged in user sent a fq to the user in the url
    let hasReceivedFriendRequest: boolean; // check if logged in user received a fq from the user in the url

    // find a user with id
    const user = await findUserWithId(id);

    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // check if user is the same as the user in the url
    if (!token) {
      isSameUser = false;
      isLoggedIn = false;
      isAdmin = false;
    } else {
      const auth0id = getAuth0Id(token!);

      const auth0User = await findUserWithAuth0Id(auth0id);

      if (!auth0User) {
        res.status(404).send({
          error: "User not found",
        });
        return;
      }

      isSameUser = user._id.toString() === auth0User._id.toString();
      isLoggedIn = true;
      isAdmin = auth0User.role === ROLES.ADMIN;

      if (!isSameUser) {
        // check if logged in user is friends with the user in the url
        isFriend = toArray(auth0User.friends).some(
          (friendId) => friendId.toString() === user._id.toString()
        );

        // don't check anything else if they're already friends
        // waste of time to check requests
        if (isFriend) {
          hasOutgoingFriendRequest = false;
          hasReceivedFriendRequest = false;
        } else {
          // check if logged in user has an ongoing friend request with the user in the url
          await auth0User.populate("sentFriendRequests");
          const sentFriendRequests = toArray(auth0User.sentFriendRequests);
          hasOutgoingFriendRequest = sentFriendRequests.some(
            (friendRequest) =>
              friendRequest.to.toString() === user._id.toString() &&
              !friendRequest.isResponded
          );

          // check if logged in user has received a friend request from the user in the url
          await auth0User.populate("receivedFriendRequests");
          const receivedFriendRequests = toArray(
            auth0User.receivedFriendRequests
          );
          hasReceivedFriendRequest = receivedFriendRequests.some(
            (friendRequest) =>
              friendRequest.from.toString() === user._id.toString() &&
              !friendRequest.isResponded
          );
        }
      }
    }

    // get privacy settings from user
    const showUserInformation =
      isSameUser || isAdmin || user.showUserInformation;
    const showEvents = isSameUser || isAdmin || user.showEvents;
    const showFriends = isSameUser || isAdmin || user.showFriends;

    const populatedUser = await findAndPopulateUser(id, {
      joinedEvents: showEvents,
      friends: showFriends,
    });

    const joinedEvents = showEvents ? toArray(populatedUser.joinedEvents) : [];
    const activeJoinedEvents = joinedEvents.filter((event) => event.isActive);
    const events = await Promise.all(
      activeJoinedEvents.map(async (participations) => {
        // find event
        const event = await findEventWithId(participations.event);

        // don't show deactivated events
        if (!event || event.isDeactivated) {
          return null;
        }

        // find active participations
        await event.populate("participants");
        const activeParticipants = toArray(event.participants).filter(
          (participation) => participation.isActive
        );

        // find event types
        await event.populate("eventTypes");
        const eventTypes = toArray(event.eventTypes);

        return {
          _id: event._id,
          name: event.name,
          eventTypes: eventTypes.map((eventType) => eventType.name),
          imageUrl: event.imageUrl,
          activityHours: event.activityHours,
          totalSeats: event.totalSeats,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          description: event.description,
          isActive: event.isActive,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          participantsCount: activeParticipants.length,
        };
      })
    );

    const friends = showFriends ? toArray(populatedUser.friends) : [];

    const userObj = {
      // fields that are always visible
      _id: user._id,
      isSameUser: isSameUser,
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
              events: events,
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
              friends: friends.map((user) => {
                return {
                  _id: user._id,
                  username: user.username,
                  profilePictureUrl: user.profilePictureUrl,
                };
              }),
            }
          : {
              show: false,
              message: "User friends are private",
            },

      // privacy settings (only sent if user is the same as the user in the url)
      privacySettings: isSameUser
        ? {
            showUserInformation: user.showUserInformation,
            showEvents: user.showEvents,
            showFriends: user.showFriends,
          }
        : undefined,

      // friends information (only sent if user is logged in
      // and is not the same user as the user in the url)
      friendsInformation:
        isLoggedIn && !isSameUser
          ? {
              // these fields will have a value if user is logged in
              // and is not the same user as the user in the url
              isFriend: isFriend!,
              hasOutgoingFriendRequest: hasOutgoingFriendRequest!,
              hasReceivedFriendRequest: hasReceivedFriendRequest!,
            }
          : undefined,
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
 * @route post /api/users/:id/edit-privacy
 * :id = user's _id
 * finds a user in the database and edits its privacy settings
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - body: {
      user: {
        showUserInformation?: boolean;
        showEvents?: boolean;
        showFriends?: boolean;
      };
    }
 * - user has to be the same as the user in the url
 *
 * results:
 * {
      message: "User privacy settings updated successfully",
    }
 */
router.post(
  "/:id/edit-privacy",
  checkAccessToken,
  checkSameUser,
  checkUserBan,
  async (req, res) => {
    // get id from url params
    const id = req.params.id;

    const body: {
      user: {
        showUserInformation?: boolean;
        showEvents?: boolean;
        showFriends?: boolean;
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

      const userJson: any = {
        updatedAt: Date.now(),
      };

      if (body.user.showUserInformation !== undefined) {
        userJson.showUserInformation = body.user.showUserInformation;
      }

      if (body.user.showEvents !== undefined) {
        userJson.showEvents = body.user.showEvents;
      }

      if (body.user.showFriends !== undefined) {
        userJson.showFriends = body.user.showFriends;
      }

      await user.updateOne(userJson);

      res.status(200).send({
        message: "User privacy settings updated successfully",
      });
    } catch (e: any) {
      // handle errors
      console.error(e);
      res.status(400).send(e);
    }
  }
);

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
router.get(
  "/:id/edit",
  checkAccessToken,
  checkSameUser,
  checkUserBan,
  async (req, res) => {
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
  }
);

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
router.post(
  "/:id/edit",
  checkAccessToken,
  checkSameUser,
  checkUserBan,
  async (req, res) => {
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
        updatedAt: Date.now(),
      };

      if (body.user.interestedEventTypes) {
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
  }
);

/**
 * @route post /api/users/:id/unfriend
 * :id = user's _id
 * finds a user in the database and remove the friend
 *
 * requirements:
 * - authorization: Bearer <access_token>
 * - auth0 role: user
 *
 * results:
 * {
        message: "User unfriended successfully",
      }
 */
router.post(
  "/:id/unfriend",
  checkAccessToken,
  checkUserRole,
  checkUserBan,
  async (req, res) => {
    // get id from url params
    const id = req.params.id;
    try {
      // get user id from token
      const token = req.get("Authorization");
      const auth0id = getAuth0Id(token!);
      const currentUser = await findUserWithAuth0Id(auth0id);
      if (!currentUser) {
        res.status(404).send({
          error: "Current user not found",
        });
        return;
      }

      // find a user with id
      const targetUser = await findUserWithId(id);

      if (!targetUser) {
        res.status(404).send({
          error: "Target user not found",
        });
        return;
      }

      // check if you have them as a friend
      const friends = toArray(currentUser.friends);

      if (
        !friends.some(
          (friendId) => friendId.toString() === targetUser._id.toString()
        )
      ) {
        res.status(400).send({
          error: "You are not friends with this user",
        });
        return;
      }

      // check if they are your friend
      const targetFriends = toArray(targetUser.friends);

      if (
        !targetFriends.some(
          (friendId) => friendId.toString() === currentUser._id.toString()
        )
      ) {
        res.status(400).send({
          error: "Target user is not your friend",
        });
        return;
      }

      // remove them from your friends
      await currentUser.updateOne({
        $pull: { friends: targetUser._id },
      });

      // remove you from their friends
      await targetUser.updateOne({
        $pull: { friends: currentUser._id },
      });

      res.status(200).send({
        message: "User unfriended successfully",
      });
    } catch (e: any) {
      // handle errors
      console.error(e);
      res.status(400).send(e);
    }
  }
);

/**
 * @route post /api/users/:id/ban
 * bans a user
 *
 * requirements:
 * - id = target user's _id
 * - authorization: Bearer <access_token>
 * - user must be an admin
 * - body {
    reason: string;
    banDuration?: number;
  }
 *
 * results:
 * {
      message,
      banId,
    }
 */
router.post("/:id/ban", checkAccessToken, checkAdminRole, async (req, res) => {
  const id = req.params.id;
  const body: {
    reason: string;
    banDuration?: number; // in seconds.. yes, seconds.
  } = req.body;

  const banDuration: number = body.banDuration ? body.banDuration : 315360000; // default to ten years in the joint

  try {
    // get user that sent the request
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const auth0User = await findUserWithAuth0Id(auth0id);

    if (!auth0User) {
      res.status(404).send({
        error: "user not found",
      });
      return;
    }

    // find user
    const targetUser = await User.findById(id);

    if (!targetUser) {
      res.status(404).send({
        message: "User not found",
      });
      return;
    }

    // populate their ban
    const currentBan = await BanLog.findById(targetUser.ban);

    // check if user is already banned
    // isActive may not be accurate (but it'll update when it needs to work)
    if (currentBan && currentBan.isActive) {
      res.status(400).send({
        message: "Target user is already banned",
      });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + banDuration * 1000);

    // create a new ban
    const newBan = new BanLog({
      reason: body.reason,
      time: now,
      expiresAt: expiresAt,
      bannedUser: targetUser._id,
      bannedBy: auth0User._id,
    });

    await newBan.save();

    // update user's ban
    await targetUser.updateOne({
      ban: newBan._id,
    });

    res.status(200).send({
      message: "User banned successfully",
      banId: newBan._id,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as userRouter };
