import express from "express";
import "./services/mongoose.ts"; // connect to MongoDB and Mongoose
import "dotenv/config"; // config from .env
import { userRouter } from "./routes/users.ts";

const app = express();
const port = process.env.PORT;

// parse body as json
app.use(express.json());

// users
app.use("/api/users", userRouter);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
