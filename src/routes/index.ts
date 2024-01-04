import { Router } from "express";
import { checkJwt } from "../middleware/auth0.ts";

const router = Router();

router.get("/1", (req, res) => {
  res.send("get /1");
});
router.get("/2", checkJwt, (req, res) => {
  res.send("get /1");
});
router.post("/", (req, res) => {
  res.send("post /");
});

export { router as base };
