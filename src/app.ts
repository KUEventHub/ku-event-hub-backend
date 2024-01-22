import express from "express";
import "./services/mongoose.ts"; // connect to MongoDB and Mongoose
import "dotenv/config"; // config from .env
import { userRouter } from "./routes/users.ts";
import { eventRouter } from "./routes/events.ts";
import cors from "cors";

// init models and schemas
import "./schema/User.ts";
import "./schema/Event.ts";
import "./schema/EventType.ts";
import "./schema/Participation.ts";
import "./schema/BanLog.ts";
import "./schema/FriendRequest.ts";

// init firebase
import "./services/firebase.ts";
import { checkActiveEvents } from "./services/events.ts";

const app = express();
const port = process.env.PORT;

// use cors
app.use(cors());
// parse body as json
app.use(express.json({ limit: "10MB" }));

// users route
app.use("/api/users", userRouter);

// events route
app.use("/api/events", eventRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

// check active events every hour
setInterval(async () => {
  await checkActiveEvents();
}, 1000 * 60 * 60);
