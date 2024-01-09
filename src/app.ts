import express from "express";
import "./services/mongoose.ts"; // connect to MongoDB and Mongoose
import "dotenv/config"; // config from .env
import { userRouter } from "./routes/users.ts";
import { eventRouter } from "./routes/events.ts";

// init models and schemas
import "./schema/User.ts";
import "./schema/Event.ts";
import "./schema/EventType.ts";
import "./schema/Participation.ts";
import "./schema/BanLog.ts";
import "./schema/FriendRequest.ts";

const app = express();
const port = process.env.PORT;

// parse body as json
app.use(express.json());

// users route
app.use("/api/users", userRouter);

// events route
app.use("/api/events", eventRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
