import { ObjectId } from "mongodb";
import Event from "../schema/Event.ts";
import { EVENT_SORT_TYPES, TABLES } from "../helper/constants.ts";
import { encryptPassword } from "../helper/crypto.ts";
import { findUserWithId } from "./users.ts";
import { signIn, signOut, uploadEventPicture } from "./firebase.ts";
import { Expression, PipelineStage } from "mongoose";
import { getEventTypesFromStrings } from "./eventtypes.ts";

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
 * Get events for the main page
 * has optional filter
 * must sort, must paginate
 * populates event types
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
  includeDeactivatedEvents: boolean;
  sortType: number;
  sortActive: boolean;
}) {
  const eventName = filter.event.name?.toLowerCase();

  // init aggregate and stages
  const aggregate: PipelineStage[] = [];
  const matches: Record<string, any> = {};
  const sorts: Record<string, 1 | -1 | Expression.Meta> = {};

  // ? --- matching stage ---
  // if the event name is given, add filter by name
  if (eventName) {
    matches.name = {
      $regex: new RegExp(eventName, "i"), // case insensitive
    };
  }

  // if there is a filter for event types
  if (filter.event.eventTypes) {
    // get event type ids
    const eventTypes = await getEventTypesFromStrings(filter.event.eventTypes);

    // if event types are found with the included event types filter
    // get its id and its children's ids
    if (eventTypes.length > 0) {
      const eventTypesIds = eventTypes.map((eventType) => eventType!._id);
      const childEventTypesIds = eventTypes.map(
        (eventType) => eventType!.childTypes
      );

      // combine event types and child event types
      const combinedEventTypesIds = [
        ...eventTypesIds,
        ...childEventTypesIds,
      ].flat();

      // add filter by event types
      matches.eventTypes = {
        $in: combinedEventTypesIds,
      };
    }
  }

  // don't match deactivated events
  if (!filter.includeDeactivatedEvents) {
    matches.isDeactivated = {
      $eq: false,
    };
  }

  // ? --- sorting stage ---
  // populate the participant field
  const populateParticipantsStage = {
    $lookup: {
      from: TABLES.PARTICIPATION,
      localField: "participants",
      foreignField: "_id",
      as: "participants",
    },
  };
  // get the active participants amount
  const activeParticipantsStage = {
    $addFields: {
      activeParticipants: {
        $size: {
          $filter: {
            input: "$participants",
            as: "participant",
            cond: {
              $eq: ["$$participant.isActive", true],
            },
          },
        },
      },
    },
  };

  // sort events based on sort type
  switch (filter.sortType) {
    case EVENT_SORT_TYPES.MOST_RECENTLY_CREATED:
      sorts.createdAt = -1;
      break;
    case EVENT_SORT_TYPES.MOST_RECENT_START_DATE:
      sorts.startTime = -1;
      break;
    case EVENT_SORT_TYPES.MOST_PARTICIPANTS: // active participants
      sorts.activeParticipants = -1;
      break;
    case EVENT_SORT_TYPES.LEAST_PARTICIPANTS: // active participants
      sorts.activeParticipants = 1;
      break;
    default:
      throw new Error("Invalid sort type");
  }

  // if sortActive is true, put inactive events at the bottom
  if (filter.sortActive) {
    sorts.isActive = -1;
  }

  // ? --- extra nifty stages --- please put inside pagination stage
  // populate event types
  const populateEventTypesStage = {
    $lookup: {
      from: TABLES.EVENT_TYPE,
      localField: "eventTypes",
      foreignField: "_id",
      as: "eventTypes",
    },
  };

  // ? --- pagination ---
  const paginationStage = {
    $facet: {
      // pagination settings (where the events are actually returned)
      data: [
        {
          $skip: (filter.pageNumber - 1) * filter.pageSize,
        },
        {
          $limit: filter.pageSize,
        },
        populateEventTypesStage, // yes, inside the pagination, to do less work
      ],
      // extra information
      info: [
        {
          $count: "count", // count how many items were found after filtering
        },
      ],
    },
  };

  // ? --- add stages to aggregate ---
  aggregate.push({
    $match: matches,
  });
  // yes, this means DO IT EVERY TIME AFTER FILTERING to EVERY ITEM
  // god only if i had a better way to do this
  aggregate.push(populateParticipantsStage);
  aggregate.push(activeParticipantsStage);
  aggregate.push({
    $sort: sorts,
  });
  // add pagination via facet (so that the count stage doesn't consume everything)
  aggregate.push(paginationStage);

  try {
    const events = await Event.aggregate(aggregate);
    // yes, facet is janky, so we need to format the data
    const formattedEvents = events[0].data.map((event: any) => {
      return {
        _id: event._id,
        name: event.name,
        imageUrl: event.imageUrl,
        activityHours: event.activityHours,
        totalSeats: event.totalSeats,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        description: event.description,
        isActive: event.isActive,
        participantsCount: event.activeParticipants, // active participants
        eventTypes: event.eventTypes,
      };
    });

    const returnData = {
      events: formattedEvents,
      count: events[0].info[0].count,
    };
    return returnData;
  } catch (e) {
    // if there is an error, just return an empty array
    return {
      events: [],
      count: 0,
    };
  }
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
    participants?: ObjectId[];
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
    participants?: boolean;
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
  if (options.participants) {
    await event.populate({
      path: "participants",
      populate: {
        path: "user",
      },
    });
  }
  if (options.eventTypes) {
    await event.populate("eventTypes");
  }

  return event;
}

/**
 * checks if there are any events that are active
 * but have already ended and updates them
 */
export async function checkActiveEvents() {
  const now = new Date();

  const events = await Event.find({
    endTime: { $lt: now },
    isActive: true,
  });

  for (const event of events) {
    await event.updateOne({
      isActive: false,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Updates an event's image and returns the url.
 *
 * @param image the image, either url or base64 encoded image
 * @param userId event id
 * @param eventId event id
 * @returns image url
 */
export async function getImageUrl(
  image: { url?: string; base64Image?: string },
  userId: string,
  eventId: string
) {
  // get user and event
  const user = await findUserWithId(userId);
  const event = await findEventWithId(eventId);

  if (!user) {
    throw new Error("User not found");
  }
  if (!event) {
    throw new Error("Event not found");
  }

  let imageUrl: string | undefined = undefined;

  // if image is sent as url, use that
  if (image.url) {
    imageUrl = image.url;
  } else if (image.base64Image) {
    // if image is sent as base64 encoded image
    // upload it to firebase and use that
    const passwordObj = await encryptPassword(
      user.auth0UserId,
      user.firebaseSalt
    );
    await signIn(user.email, passwordObj.password);
    imageUrl = await uploadEventPicture(
      event._id.toString(),
      image.base64Image
    );
    await signOut();
  }

  return imageUrl;
}
