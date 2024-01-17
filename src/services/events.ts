import { ObjectId } from "mongodb";
import Event from "../schema/Event.ts";
import { getEventTypesFromStrings } from "./eventtypes.ts";
import { EVENT_SORT_TYPES, TABLES } from "../helper/constants.ts";

/**
 * Creates a new event, saves it to the database
 * and returns the event object.
 * @param event event information
 * @returns `Event` object
 */
export async function createEvent(event: {
  name: string;
  imageUrl: string;
  activityHours: number;
  totalSeats: number;
  startTime: Date;
  endTime: Date;
  location: string;
  description?: string;
  eventTypes: string[];
  profilePictureUrl: string;
}) {
  // create a new event object
  const createdEvent = new Event(event);

  // save the event to the database
  await createdEvent.save();

  return createdEvent;
}

/**
 * Finds an event in the database and returns it.
 * Also filters the event types.
 * Also populates event types after filtering.
 *
 * @param pageNumber page number
 * @param pageSize page size
 * @param event event information
 * @returns `Event` object
 */
export async function getEvents(filter: {
  pageNumber: number;
  pageSize: number;
  event: {
    name?: string;
    eventTypes?: string[];
  };
  sortType: number;
}) {
  const filterJson: any = {};

  // filter out start time that was before now
  filterJson.$match = {
    startTime: { $gt: Date.now() },
  };

  // if there is a filter for event name
  if (filter.event.name) {
    filterJson.$match = {
      ...filterJson.$match,
      name: {
        $regex: filter.event.name,
      },
    };
  }
  // if there is a filter for event types
  if (filter.event.eventTypes) {
    const eventTypes = await getEventTypesFromStrings(filter.event.eventTypes);

    if (eventTypes.length > 0) {
      const eventTypesIds = eventTypes.map((eventType) => eventType!._id);

      filterJson.$match = {
        ...filterJson.$match,
        eventTypes: {
          $in: eventTypesIds,
        },
      };
    }
  }

  let aggregate = [];

  aggregate.push(filterJson);

  // add joined users count
  aggregate.push({
    $addFields: {
      joinedUsersCount: { $size: "$joinedUsers" },
    },
  });

  switch (filter.sortType) {
    case EVENT_SORT_TYPES.MOST_RECENTLY_CREATED:
      aggregate.push({
        $sort: {
          createdAt: -1,
        },
      });
      break;
    case EVENT_SORT_TYPES.MOST_RECENT_START_DATE:
      aggregate.push({
        $sort: {
          startTime: 1,
        },
      });
      break;
    case EVENT_SORT_TYPES.MOST_PARTICIPANTS:
      aggregate.push({
        $sort: {
          joinedUsers: -1,
        },
      });
      break;
    default:
      throw new Error("Invalid sort type");
  }

  // add pagination
  aggregate.push({
    $skip: (filter.pageNumber - 1) * filter.pageSize,
  });
  aggregate.push({
    $limit: filter.pageSize,
  });

  // populate event types
  aggregate.push({
    $lookup: {
      from: TABLES.EVENT_TYPE,
      localField: "eventTypes",
      foreignField: "_id",
      as: "eventTypes",
    },
  });

  const events = await Event.aggregate(aggregate);

  return events;
}

/**
 * Updates an event in the database and returns it.
 *
 * @param id event id (ObjectId)
 * @param event event information
 * @returns `Event` object
 */
export async function updateEvent(
  id: string,
  event: {
    name?: string;
    imageUrl?: string;
    activityHours?: number;
    totalSeats?: number;
    startTime?: Date;
    endTime?: Date;
    location?: string;
    description?: string;
    isActive?: boolean;
    qrCodeString?: string;
    joinedUsers?: ObjectId[];
    eventTypes?: ObjectId[];
  }
) {
  const eventJson = {
    ...event,
    updatedAt: Date.now(),
  };

  // find an event with id
  const foundEvent = await Event.findByIdAndUpdate(id, eventJson);

  return foundEvent;
}

/**
 * Finds an event in the database and returns it.
 * @param id event id (ObjectId)
 * @returns `Event` object
 */
export async function findEventWithId(id: string) {
  const event = await Event.findById(id);

  return event;
}

/**
 * Finds an event in the database and returns it.
 * Populates the event with the given options.
 *
 * @param id event id
 * @param options options for populating the event
 * @returns `Event` object (populater as per option)
 */
export async function findAndPopulateEvent(
  id: string,
  options: {
    createdBy?: boolean;
    joinedUsers?: boolean;
    eventTypes?: boolean;
  }
) {
  const event = await findEventWithId(id);

  if (!event) {
    throw new Error("Event not found");
  }

  if (options.createdBy) {
    await event.populate("createdBy");
  }
  if (options.joinedUsers) {
    await event.populate("joinedUsers");
  }
  if (options.eventTypes) {
    await event.populate("eventTypes");
  }

  return event;
}
