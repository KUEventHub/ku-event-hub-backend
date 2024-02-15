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
      (friendRequest) => !friendRequest.isResponded
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
      (friendRequest) => !friendRequest.isResponded
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

export { router as friendRequestRouter };
