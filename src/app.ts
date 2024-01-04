import express from "express";
import { base } from "./routes/index.ts";
import "dotenv/config"; // config from .env

const app = express();
const port = process.env.PORT;

app.use("/api/", base);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
