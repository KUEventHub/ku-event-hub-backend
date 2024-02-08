import { ObjectId } from "mongodb";
import Event from "../schema/Event.ts";
import { getEventTypesFromStrings } from "./eventtypes.ts";
import { EVENT_SORT_TYPES, TABLES } from "../helper/constants.ts";
import { encryptPassword } from "./bcrypt.ts";
import { findUserWithAuth0Id, findUserWithId } from "./users.ts";
import { signIn, signOut, uploadEventPicture } from "./firebase.ts";
import { toArray } from "./mongoose.ts";

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
  sortActive: boolean;
}) {
  const matchJson: any = {};
  const sortJson: any = {};

  // // filter out start time that was before now
  // filterJson.$match = {
  //   startTime: { $gt: new Date() },
  // };

  // if there is a filter for event name
  if (filter.event.name) {
    matchJson.$match = {
      ...matchJson.$match,
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
      const childEventTypesIds = eventTypes.map(
        (eventType) => eventType!.childTypes
      );

      // combine event types and child event types
      const combinedEventTypesIds = [
        ...eventTypesIds,
        ...childEventTypesIds,
      ].flat();

      matchJson.$match = {
        ...matchJson.$match,
        eventTypes: {
          $in: combinedEventTypesIds,
        },
      };
    }
  }

  let aggregate = [];

  switch (filter.sortType) {
    case EVENT_SORT_TYPES.MOST_RECENTLY_CREATED:
      sortJson.$sort = {
        ...sortJson.$sort,
        createdAt: -1,
      };
      break;
    case EVENT_SORT_TYPES.MOST_RECENT_START_DATE:
      sortJson.$sort = {
        ...sortJson.$sort,
        startTime: -1,
      };
      break;
    case EVENT_SORT_TYPES.MOST_PARTICIPANTS:
      sortJson.$sort = {
        ...sortJson.$sort,
        participants: -1,
      };
      break;
    case EVENT_SORT_TYPES.LEAST_PARTICIPANTS:
      sortJson.$sort = {
        ...sortJson.$sort,
        participants: 1,
      };
      break;
    default:
      throw new Error("Invalid sort type");
  }

  // if sortActive is true, put inactive events at the bottom
  if (filter.sortActive) {
    sortJson.$sort = {
      isActive: -1,
      ...sortJson.$sort,
    };
  }

  // add match filter
  if (matchJson.$match) {
    aggregate.push(matchJson);
  }
  // add sort filter
  if (sortJson.$sort) {
    aggregate.push(sortJson);
  }

  // add pagination
  aggregate.push({
    $skip: (filter.pageNumber - 1) * filter.pageSize,
  });
  aggregate.push({
    $limit: filter.pageSize,
  });

  const events = await Event.aggregate(aggregate);

  // console.log(events);

  const modifiedEvents = events.map(async (event) => {
    const eventObj = await findEventWithId(event._id);

    if (!eventObj) {
      throw new Error("Event not found");
    }

    await eventObj.populate("participants");
    await eventObj.populate("eventTypes");
    const eventTypes = toArray(eventObj.eventTypes);

    const participants = toArray(eventObj.participants);
    const activeParticipants = participants.filter(
      (participant) => participant.isActive
    );

    const returnObj = {
      ...eventObj,
      eventTypes: eventTypes,
      participantsCount: activeParticipants.length,
    };

    return returnObj;
  });

  const promisedEvents = await Promise.all(modifiedEvents);

  const formattedPromisedEvents = promisedEvents.map((event: any) => {
    const doc = event._doc;

    return {
      _id: doc._id,
      name: doc.name,
      imageUrl: doc.imageUrl,
      activityHours: doc.activityHours,
      totalSeats: doc.totalSeats,
      startTime: doc.startTime,
      endTime: doc.endTime,
      location: doc.location,
      description: doc.description,
      isActive: doc.isActive,
      participantsCount: event.participantsCount,
      eventTypes: event.eventTypes,
    };
  });

  return formattedPromisedEvents;
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
