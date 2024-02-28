import express from "express";
import "./services/mongoose.ts"; // connect to MongoDB and Mongoose
import "dotenv/config"; // config from .env
import cors from "cors";

// routers
import { userRouter } from "./routes/users.ts";
import { eventRouter } from "./routes/events.ts";
import { friendRequestRouter } from "./routes/friendRequests.ts";
import { adminRouter } from "./routes/admin.ts";

// init models and schemas
import "./schema/User.ts";
import "./schema/Event.ts";
import "./schema/EventType.ts";
import "./schema/Participation.ts";
import "./schema/BanLog.ts";
import "./schema/FriendRequest.ts";

// init firebase
import "./services/firebase.ts";

// services
import { checkActiveEvents } from "./services/events.ts";
import { checkActiveBans } from "./services/bans.ts";

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

// friend requests route
app.use("/api/friend-requests", friendRequestRouter);

// admin route
app.use("/api/admin", adminRouter);

app.listen(port, () => {
  console.log(
    `\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n[server]: Server is running at http://localhost:${port}\n`
  );
});

// check active events and ban every hour
setInterval(async () => {
  await checkActiveEvents();
  await checkActiveBans();
}, 1000 * 60 * 60);
