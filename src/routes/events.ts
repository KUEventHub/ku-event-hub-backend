import { Router } from "express";
import Event from "../schema/Event.ts";
import { checkAdminRole, checkJwt } from "../middleware/auth.ts";
import { getEventTypesFromStrings } from "../services/eventtypes.ts";
import { findUserWithAuth0Id, getAuth0Id } from "../services/users.ts";

const router = Router();

/**
 * @route get /api/events
 * get all events.
 * if search is provided, only events with names that contain the search string are returned.
 * if eventTypes is provided, only events with eventTypes that contain the eventTypes string are returned.
 * yes, you can provide both search and eventTypes.
 * if page is provided, only events in that page are returned.
 *
 * requirements:
 * - body: {
      search?: string;
      eventTypes?: string[];
      page: number;
    }
 *
 * results:
 * - 200: {
      pageNumber,
      pageSize,
      events,
    }
 * - 400: {error}
 */
router.get("/", async (req, res) => {
  const body: {
    search?: string;
    eventTypes?: string[];
    page?: number;
  } = req.body;

  const pageSize = 20;
  const pageNumber = body.page ? body.page : 1;

  try {
    const events = await Event.aggregate([
      {
        $match: {
          name: {
            $regex: body.search ? body.search : "",
          },
          eventTypes: {
            $in: body.eventTypes ? ["eventTypes", body.eventTypes] : [],
          },
        },
      },
      {
        $skip: (pageNumber - 1) * pageSize,
      },
      {
        $limit: pageSize,
      },
    ]);
    res.status(200).send({
      pageNumber,
      pageSize,
      events,
    });
  } catch (e: any) {
    // handle error
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * i'll finish this tomorrow
 * 
 * @route post /api/events/create
 */
router.post("/create", checkJwt, checkAdminRole, async (req, res) => {
  const body: {
    event: {
      name: string;
      imageUrl: string;
      activityHours: number;
      totalSeats: number;
      startTime: Date;
      endTime: Date;
      location: string;
      description?: string;
      eventTypes?: string[];
    };
  } = req.body;

  try {
    // get user
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);

    if (!user) {
      res.status(404).send({
        error: "user not found",
      });
      return;
    }

    const eventJson = {
      name: body.event.name,
      imageUrl: body.event.imageUrl,
      activityHours: body.event.activityHours,
      totalSeats: body.event.totalSeats,
      startTime: body.event.startTime,
      endTime: body.event.endTime,
      location: body.event.location,
      description: body.event.description,
      eventTypes: body.event.eventTypes
        ? await getEventTypesFromStrings(body.event.eventTypes)
        : [],
      createdBy: user._id,
    };
  } catch (e: any) {
    // handle error
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as eventRouter };
