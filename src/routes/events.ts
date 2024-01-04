import { Router } from "express";
import { checkJwt } from "../middleware/auth0.ts";
import { fetchEvents } from "../services/events.ts";

const router = Router();

router.get("/", async (req, res) => {
  // assume that the filter is sent in the body as json
  const body: {
    filter?: Map<string, any>;
  } = req.body;

  // does nothing with it for now
  res.send(await fetchEvents());
});

export { router as events };
