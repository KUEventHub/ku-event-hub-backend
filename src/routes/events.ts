import { Router } from "express";
import { checkJwt } from "../services/auth.ts";
import Event from "../schema/Event.ts";

const router = Router();

/**
 * @route get /api/events
 * get all events
 *
 * requirements:
 * - body: {search?, eventTypes?, page}
 *
 * results:
 * - 200: ...
 * - 400: {error}
 */
router.get("/", async (req, res) => {
  const body: {
    search?: string;
    eventTypes?: string[];
    page: number;
  } = req.body;

  const pageSize = 20;

  // try {
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
  // } catch (e: any) {
  //   res.status(400).send(e);
  // }
});

export { router as eventRouter };
