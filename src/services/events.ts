import Event from "../schema/Event.ts";
import { FilterQuery } from "mongoose";

export async function fetchEvents(filter?: FilterQuery<any>) {
  return await Event.find(filter || {});
}
