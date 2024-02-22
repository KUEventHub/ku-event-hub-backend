import { Router } from "express";
import { checkAccessToken, checkUserRole } from "../middleware/auth.ts";
import { findUserWithAuth0Id, getAuth0Id } from "../services/users.ts";
import { toArray } from "../services/mongoose.ts";
import User from "../schema/User.ts";
import FriendRequest from "../schema/FriendRequest.ts";
import { ROLES } from "../helper/constants.ts";

const router = Router();

/**
 * @route get /api/friend-requests/received
 * get logged in user's received friend requests
 *
 * requirements:
 * - user must be logged in
 * - user must have user role
 * 
 * results:
 * {
      message: "Successfully retrieved received friend requests",
      requests: [{
        _id,
        user: {
          _id,
          username,
          profilePictureUrl,
        },
      }],
    }
 */
router.get("/received", checkAccessToken, checkUserRole, async (req, res) => {
  try {
    // get logged in user
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);

    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // get the user's received friend requests
    await user.populate({
      path: "receivedFriendRequests",
      populate: {
        path: "from",
      },
    });
    const receivedFriendRequests = toArray(user.receivedFriendRequests).filter(
      // only return unresponded requests
      // no point in returning responded requests
      (friendRequest) =>
        !friendRequest.isResponded && !friendRequest.isCancelled
    );

    const requests = receivedFriendRequests.map((request) => {
      return {
        _id: request._id,
        user: {
          // required
          _id: request.from._id,
          username: request.from.username,
          profilePictureUrl: request.from.profilePictureUrl,
        },
      };
    });

    res.status(200).send({
      message: "Successfully retrieved received friend requests",
      requests,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route get /api/friend-requests/sent
 * get logged in user's sent friend requests
 *
 * requirements:
 * - user must be logged in
 * - user must have user role
 * 
 * results:
 * {
      message: "Successfully retrieved received friend requests",
      requests: [{
        _id,
        user: {
          _id,
          username,
          profilePictureUrl,
        },
      }],
    }
 */
router.get("/sent", checkAccessToken, checkUserRole, async (req, res) => {
  try {
    // get logged in user
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);

    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // get the user's sent friend requests
    await user.populate({
      path: "sentFriendRequests",
      populate: {
        path: "to",
      },
    });
    const sentFriendRequests = toArray(user.sentFriendRequests).filter(
      // only return unresponded requests
      // no point in returning responded requests
      (friendRequest) =>
        !friendRequest.isResponded && !friendRequest.isCancelled
    );

    const requests = sentFriendRequests.map((request) => {
      return {
        _id: request._id,
        user: {
          // required
          _id: request.to._id,
          username: request.to.username,
          profilePictureUrl: request.to.profilePictureUrl,
        },
      };
    });

    res.status(200).send({
      message: "Successfully retrieved sent friend requests",
      requests,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route get /api/friend-requests/add
 * send a friend request from the logged in user
 *
 * requirements:
 * - user must be logged in
 * body: {
      userId: string;
    }
 *
 * results:
 *
 */
router.post("/add", checkAccessToken, checkUserRole, async (req, res) => {
  const body: {
    userId: string; // user id to send friend request to
  } = req.body;
  try {
    // get logged in user
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const currentUser = await findUserWithAuth0Id(auth0id);

    if (!currentUser) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // get the target user
    const targetUser = await User.findById(body.userId);

    if (!targetUser) {
      res.status(404).send({
        error: "Target user not found",
      });
      return;
    }

    // check if you are not sending the request to yourself
    if (currentUser._id.toString() === targetUser._id.toString()) {
      res.status(400).send({
        error: "You can't send a friend request to yourself",
      });
      return;
    }

    // check if target user is an admin
    if (targetUser.role === ROLES.ADMIN) {
      res.status(400).send({
        error: "You can't send friend requests to an admin",
      });
      return;
    }

    // check existing friend requests
    await currentUser.populate("sentFriendRequests");
    const currentUserSentRequests = toArray(currentUser.sentFriendRequests);

    // check if user already sent a request
    const hasOngoingRequest = currentUserSentRequests.find(
      // check if the target user's id exists in the sent friend requests
      // and has not been responded
      (friendRequest) =>
        friendRequest.to.toString() === body.userId &&
        !friendRequest.isResponded
    );

    if (hasOngoingRequest) {
      res.status(400).send({
        error: "You already have an ongoing friend request to this user",
      });
      return;
    }

    // check if target user already sent a request to the current user
    await targetUser.populate("sentFriendRequests");
    const targetUserSentRequests = toArray(targetUser.sentFriendRequests);

    // check if user already sent a request
    const hasUnrespondedRequest = targetUserSentRequests.find(
      // check if the current user's id exists in the
      // target user's sent friend requests
      // and has not been responded
      (friendRequest) =>
        friendRequest.to.toString() === currentUser._id.toString() &&
        !friendRequest.isResponded
    );

    if (hasUnrespondedRequest) {
      res.status(400).send({
        error:
          "This user already sent a friend request to you, please respond to it first",
      });
      return;
    }

    // check if target user is already a friend
    await currentUser.populate("friends");
    const currentUserFriends = toArray(currentUser.friends);
    const isAlreadyFriend = currentUserFriends.find(
      (friend) => friend._id.toString() === body.userId
    );

    if (isAlreadyFriend) {
      res.status(400).send({
        error: "You are already friends with this user",
      });
      return;
    }

    // send the friend request
    const friendRequest = new FriendRequest({
      from: currentUser._id,
      to: targetUser._id,
    });
    await friendRequest.save();

    // update the user's friend requests
    currentUser.depopulate("sentFriendRequests");
    const currentUserSentRequestIds = toArray(currentUser.sentFriendRequests);
    currentUserSentRequestIds.push(friendRequest._id);
    await currentUser.updateOne({
      sentFriendRequests: currentUserSentRequestIds,
    });

    // update the target user's friend requests
    const targetUserReceivedRequestIds = toArray(
      targetUser.receivedFriendRequests
    );
    targetUserReceivedRequestIds.push(friendRequest._id);
    await targetUser.updateOne({
      receivedFriendRequests: targetUserReceivedRequestIds,
    });

    res.status(200).send({
      message: `Friend request sent to ${targetUser.username}`,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route get /api/friend-requests/:id/accept
 * accept a friend request
 * (ignoring the rare case where both sides have requests at each other)
 * (let's just make them sort it out by themselves)
 * it's like what they say: a restart is a solution to all problems
 *
 * requirements:
 * - :id -> friend request id
 * - user must be logged in
 * - user must have user role
 *
 * results:
 * {
      message: "Friend request accepted",
    }
 */
router.post(
  "/:id/accept",
  checkAccessToken,
  checkUserRole,
  async (req, res) => {
    const id = req.params.id;
    try {
      // get logged in user
      const token = req.get("Authorization");
      const auth0id = getAuth0Id(token!);
      const currentUser = await findUserWithAuth0Id(auth0id);

      if (!currentUser) {
        res.status(404).send({
          error: "User not found",
        });
        return;
      }

      // find friend request
      const friendRequest = await FriendRequest.findById(id);

      if (!friendRequest) {
        res.status(404).send({
          error: "Friend request not found",
        });
        return;
      }

      // check if the friend request is for the current user
      if (friendRequest.to.toString() !== currentUser._id.toString()) {
        res.status(400).send({
          error: "This friend request is not for you",
        });
        return;
      }

      // check if friend request is already responded
      if (friendRequest.isResponded) {
        res.status(400).send({
          error: "This friend request has already been responded",
        });
        return;
      }

      // check if friend request is already cancelled
      if (friendRequest.isCancelled) {
        res.status(400).send({
          error: "This friend request has already been cancelled",
        });
        return;
      }

      // check if you are already friends with the user
      const friendIds = toArray(currentUser.friends);
      const isAlreadyFriend = friendIds.some(
        (friendId) => friendId.toString() === friendRequest.from.toString()
      );

      if (isAlreadyFriend) {
        res.status(400).send({
          error: "You are already friends with this user",
        });
        return;
      }

      // find the target user
      const targetUser = await User.findById(friendRequest.from);
      if (!targetUser) {
        res.status(404).send({
          error: "Target user not found",
        });
        return;
      }

      // accept the friend request
      friendRequest.isResponded = true;
      friendRequest.isAccepted = true;
      friendRequest.updatedAt = new Date();
      await friendRequest.save();

      // update the target user's friend list
      const targetUserFriendIds = toArray(targetUser.friends);
      targetUserFriendIds.push(friendRequest.to);
      await targetUser.updateOne({
        friends: targetUserFriendIds,
      });

      // update the current user's friend list
      const currentUserFriendIds = toArray(currentUser.friends);
      currentUserFriendIds.push(friendRequest.from);
      await currentUser.updateOne({
        friends: currentUserFriendIds,
      });

      res.status(200).send({
        message: "Friend request accepted",
      });
    } catch (e: any) {
      // handle errors
      console.error(e);
      res.status(400).send(e);
    }
  }
);

/**
 * @route get /api/friend-requests/:id/reject
 * reject a friend request
 * (ignoring the rare case where both sides have requests at each other)
 * (let's just make them sort it out by themselves)
 * it's like what they say: a restart is a solution to all problems
 *
 * requirements:
 * - :id -> friend request id
 * - user must be logged in
 * - user must have user role
 *
 * results:
 * {
      message: "Friend request rejected",
    }
 */
router.post(
  "/:id/reject",
  checkAccessToken,
  checkUserRole,
  async (req, res) => {
    const id = req.params.id;
    try {
      // get logged in user
      const token = req.get("Authorization");
      const auth0id = getAuth0Id(token!);
      const currentUser = await findUserWithAuth0Id(auth0id);

      if (!currentUser) {
        res.status(404).send({
          error: "User not found",
        });
        return;
      }

      // find friend request
      const friendRequest = await FriendRequest.findById(id);

      if (!friendRequest) {
        res.status(404).send({
          error: "Friend request not found",
        });
        return;
      }

      // check if the friend request is for the current user
      if (friendRequest.to.toString() !== currentUser._id.toString()) {
        res.status(400).send({
          error: "This friend request is not for you",
        });
        return;
      }

      // check if friend request is already responded
      if (friendRequest.isResponded) {
        res.status(400).send({
          error: "This friend request has already been responded",
        });
        return;
      }

      // check if friend request is already cancelled
      if (friendRequest.isCancelled) {
        res.status(400).send({
          error: "This friend request has already been cancelled",
        });
        return;
      }

      // check if you are already friends with the user
      const friendIds = toArray(currentUser.friends);
      const isAlreadyFriend = friendIds.some(
        (friendId) => friendId.toString() === friendRequest.from.toString()
      );

      if (isAlreadyFriend) {
        res.status(400).send({
          error: "You are already friends with this user",
        });
        return;
      }

      // find the target user
      const targetUser = await User.findById(friendRequest.from);
      if (!targetUser) {
        res.status(404).send({
          error: "Target user not found",
        });
        return;
      }

      // accept the friend request
      friendRequest.isResponded = true;
      friendRequest.isAccepted = false;
      friendRequest.updatedAt = new Date();
      await friendRequest.save();

      res.status(200).send({
        message: "Friend request rejected",
      });
    } catch (e: any) {
      // handle errors
      console.error(e);
      res.status(400).send(e);
    }
  }
);

/**
 * @route get /api/friend-requests/:id/cancel
 * cancel a friend request
 *
 * requirements:
 * - :id -> friend request id
 * - user must be logged in
 * - user must have user role
 *
 * results:
 * {
      message: "Friend request cancelled",
    }
 */
router.post(
  "/:id/cancel",
  checkAccessToken,
  checkUserRole,
  async (req, res) => {
    const id = req.params.id;
    try {
      // get logged in user
      const token = req.get("Authorization");
      const auth0id = getAuth0Id(token!);
      const currentUser = await findUserWithAuth0Id(auth0id);

      if (!currentUser) {
        res.status(404).send({
          error: "User not found",
        });
        return;
      }

      // find friend request
      const friendRequest = await FriendRequest.findById(id);

      if (!friendRequest) {
        res.status(404).send({
          error: "Friend request not found",
        });
        return;
      }

      // check if the friend request is for the current user
      if (friendRequest.to.toString() !== currentUser._id.toString()) {
        res.status(400).send({
          error: "This friend request is not for you",
        });
        return;
      }

      // check if friend request is already responded
      if (friendRequest.isResponded) {
        res.status(400).send({
          error: "This friend request has already been responded",
        });
        return;
      }

      // check if friend request is already cancelled
      if (friendRequest.isCancelled) {
        res.status(400).send({
          error: "This friend request has already been cancelled",
        });
        return;
      }

      // check if you are already friends with the user
      const friendIds = toArray(currentUser.friends);
      const isAlreadyFriend = friendIds.some(
        (friendId) => friendId.toString() === friendRequest.from.toString()
      );

      if (isAlreadyFriend) {
        res.status(400).send({
          error: "You are already friends with this user",
        });
        return;
      }

      // find the target user
      const targetUser = await User.findById(friendRequest.from);
      if (!targetUser) {
        res.status(404).send({
          error: "Target user not found",
        });
        return;
      }

      // accept the friend request
      friendRequest.isResponded = true;
      friendRequest.isCancelled = true;
      friendRequest.updatedAt = new Date();
      await friendRequest.save();

      res.status(200).send({
        message: "Friend request cancelled",
      });
    } catch (e: any) {
      // handle errors
      console.error(e);
      res.status(400).send(e);
    }
  }
);

export { router as friendRequestRouter };
