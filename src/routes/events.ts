import { Router } from "express";
import Event from "../schema/Event.ts";

const router = Router();

/**
 * @route get /api/events
 * get all events.
 * if search is provided, only events with names that contain the search string are returned.
 * if eventTypes is provided, only events with eventTypes that contain the eventTypes string are returned.
 * yes, you can provide both search and eventTypes.
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
      page: body.page,
      pageSize,
      events,
    }
 * - 400: {error}
 */
router.get("/", async (req, res) => {
  const body: {
    search?: string;
    eventTypes?: string[];
    page: number;
  } = req.body;

  const pageSize = 20;

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
        $skip: (body.page - 1) * pageSize,
      },
      {
        $limit: pageSize,
      },
    ]);
    res.status(200).send({
      page: body.page,
      pageSize,
      events,
    });
  } catch (e: any) {
    // handle error
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as eventRouter };
