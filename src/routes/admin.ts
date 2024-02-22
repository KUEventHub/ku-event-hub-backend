import { Router } from "express";
import { checkAccessToken, checkAdminRole } from "../middleware/auth.ts";
import User from "../schema/User.ts";
import { ROLES, TABLES } from "../helper/constants.ts";

const router = Router();

/**
 * @route get /api/admin/user-list
 * gets a list of users
 *
 * requirements:
 * - user must be logged in
 * - user must be an admin
 * - params: {
      includeAdmins: boolean;
      pageSize: number;
      pageNumber: number;
    }
 *
 * results:
 * {
      pageNumber,
      pageSize,
      noPages,
      users,
      totalUsers,
    }
 */
router.get("/user-list", checkAccessToken, checkAdminRole, async (req, res) => {
  const includeAdmins: boolean = req.query.includeAdmins
    ? req.query.includeAdmins.toString().toLowerCase() === "true"
    : false;
  const pageNumber: number = req.query.pageNumber
    ? parseInt(req.query.pageNumber.toString())
    : 1;
  const pageSize: number = req.query.pageSize
    ? parseInt(req.query.pageSize.toString())
    : 20;
  try {
    // get a list of users
    const aggregatedUsers = await User.aggregate([
      includeAdmins
        ? {
            $match: {
              role: { $in: [ROLES.ADMIN, ROLES.USER] },
            },
          }
        : {
            $match: {
              role: ROLES.USER,
            },
          },
      {
        $facet: {
          // pagination settings (where the events are actually returned)
          data: [
            {
              $lookup: {
                from: TABLES.LOGIN_LOG,
                localField: "_id",
                foreignField: "user",
                as: "loginLog",
              },
            },
            {
              $unwind: {
                path: "$loginLog",
                preserveNullAndEmptyArrays: true, // keep users without a login log
              },
            },
            {
              $sort: {
                "loginLog.time": -1, // sort by time in descending order
              },
            },
            {
              $group: {
                _id: "$_id",
                username: { $first: "$username" },
                role: { $first: "$role" },
                firstName: { $first: "$firstName" },
                lastName: { $first: "$lastName" },
                profilePictureUrl: { $first: "$profilePictureUrl" },
                email: { $first: "$email" },
                loginTime: {
                  $first: {
                    $ifNull: ["$loginLog.time", "$createdAt", new Date(0)], // provide a default value if there's no login log
                  },
                },
              },
            },
            {
              $skip: (pageNumber - 1) * pageSize,
            },
            {
              $limit: pageSize,
            },
          ],
          // extra information
          info: [
            {
              $count: "count", // count how many items were found after filtering
            },
          ],
        },
      },
    ]);

    const users = aggregatedUsers[0].data;

    const totalUsers = aggregatedUsers[0].info[0].count;

    const noPages = Math.ceil(totalUsers / pageSize);

    res.status(200).send({
      pageNumber,
      pageSize,
      noPages,
      users,
      totalUsers,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/admin/ban
 *
 *
 * requirements:
 *
 *
 *
 * results:
 *
 *
 *
 */
router.post("/ban", checkAccessToken, checkAdminRole, async (req, res) => {
  const body: {
    userId: string;
    reason: string;
    banLength: number; // in seconds.. yes, seconds.
  } = req.body;

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + body.banLength * 1000);
    res.status(200).send({
      message: "hi it's not done yet but please take it for now",
      now,
      expiresAt,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as adminRouter };
