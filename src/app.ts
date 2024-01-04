import express from "express";
import { events } from "./routes/events.ts";
import "./services/mongoose.ts"; // connect to MongoDB and Mongoose
import "dotenv/config"; // config from .env

const app = express();
const port = process.env.PORT;

// events
app.use("/api/events", events);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
