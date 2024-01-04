import "dotenv/config"; // config from .env
import mongoose from "mongoose";

// Create a MongoDB URI for mongoose to connect to the database
const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
await mongoose.connect(uri);
