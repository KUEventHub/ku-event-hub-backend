import "dotenv/config"; // config from .env
import mongoose, { Types } from "mongoose";

// Create a MongoDB URI for mongoose to connect to the database
const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
await mongoose.connect(uri);

/**
 * Converts a DocumentArray "array" to a normal array.
 * 
 * @param obj the `DocumentArray` "array" that you want converted to a normal array
 * @returns a normal array
 */
export function toArray(obj: {
  [Symbol.species]: any[];
  prototype:
    | Types.DocumentArray<any>
    | any[]
    | {
        [x: string]: any;
      }[]
    | any[];
  isArray?: {} | null | undefined;
  from?: {} | null | undefined;
  of?: {} | null | undefined;
}) {
  return Array.prototype.slice.call(obj);
}
