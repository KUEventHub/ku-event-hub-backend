import { Router } from "express";
import {
  checkAdminRole,
  checkAccessToken,
  checkUserRole,
} from "../middleware/auth.ts";
import { getEventTypesFromStrings } from "../services/eventtypes.ts";
import { findUserWithAuth0Id, getAuth0Id } from "../services/users.ts";
import {
  createEvent,
  findAndPopulateEvent,
  findEventWithId,
  getEvents,
  getImageUrl,
  updateEvent,
} from "../services/events.ts";
import { EVENT_SORT_TYPES } from "../helper/constants.ts";
import { toArray } from "../services/mongoose.ts";
import Participation from "../schema/Participation.ts";

const router = Router();

/**
 * @route get /api/events
 * get all events. optional filter.
 *
 * requirements:
 * - params: {
 *    pageNumber: number;
 *    pageSize: number;
 *    eventName?: string;
 *    eventType?: string;
 *    sortType?: number;
 *    sortActive?: boolean;
 *  }
 *
 * results:
 * {
      pageNumber,
      pageSize,
      noPages,
      events,
    }
 */
router.get("/", async (req, res) => {
  const pageNumber: number = req.query.pageNumber
    ? parseInt(req.query.pageNumber.toString())
    : 1;
  const pageSize: number = req.query.pageSize
    ? parseInt(req.query.pageSize.toString())
    : 20;

  const eventName = req.query.eventName?.toString();
  const eventType = req.query.eventType?.toString();
  const sortType = req.query.sortType
    ? parseInt(req.query.sortType.toString())
    : EVENT_SORT_TYPES.MOST_RECENTLY_CREATED;

  const sortActive = req.query.sortActive
    ? req.query.sortActive.toString() === "true"
    : true;

  try {
    const events = await getEvents({
      pageNumber,
      pageSize,
      event: {
        name: eventName,
        eventTypes: eventType ? [eventType] : [],
      },
      sortType,
      sortActive,
    });

    const noPages = Math.ceil(events.length / pageSize);

    res.status(200).send({
      pageNumber,
      pageSize,
      noPages,
      events,
    });
  } catch (e: any) {
    // handle error
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/events/create
 * create an event, saves it to the database
 * 
 * requirements:
 * - authorization: Bearer <access_token>
 * - auth0 role: Admin
 * - body: {
      event: {
        name: string;
        activityHours: number;
        totalSeats: number;
        startTime: number;
        endTime: number;
        location: string;
        description?: string;
        eventTypes: string[];
        image: {
          url?: string;
          base64Image?: string;
        };
      };
    }
 * results:
 * {
      message: "Event created successfully",
      id: string,
    }   
 */
router.post("/create", checkAccessToken, checkAdminRole, async (req, res) => {
  const body: {
    event: {
      name: string;
      activityHours: number;
      totalSeats: number;
      startTime: number;
      endTime: number;
      location: string;
      description?: string;
      eventTypes: string[];
      image: {
        url?: string;
        base64Image?: string;
      };
    };
  } = req.body;

  try {
    // get user that sent the request
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);

    if (!user) {
      res.status(404).send({
        error: "user not found",
      });
      return;
    }

    const startTime = new Date(body.event.startTime);
    const endTime = new Date(body.event.endTime);

    const eventTypes = await getEventTypesFromStrings(body.event.eventTypes);

    const eventTypesIds =
      eventTypes.length > 0
        ? eventTypes.map((eventType) => eventType!._id)
        : [];

    if (eventTypesIds.length <= 0) {
      res.status(400).send({
        error: "no event types found",
      });
      return;
    }

    const eventJson: any = {
      name: body.event.name,
      activityHours: body.event.activityHours,
      totalSeats: body.event.totalSeats,
      startTime: startTime,
      endTime: endTime,
      location: body.event.location,
      description: body.event.description,
      eventTypes: eventTypesIds,
      createdBy: user._id,
    };

    const event = await createEvent(eventJson);

    let imageUrl = await getImageUrl(
      body.event.image,
      user._id.toString(),
      event._id.toString()
    );

    // if there is an image url, add it to the event
    if (imageUrl) {
      await updateEvent(event._id.toString(), {
        imageUrl: imageUrl,
      });
    }

    res.status(200).send({
      message: "Event created successfully",
      id: event._id,
    });
  } catch (e: any) {
    // handle error
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route get /api/events/:id
 * :id = event's _id
 * finds an event in the database and returns information
 * 
 * requirements:
 * - params: {
      id: string;
    }
 * 
 * results:
 * {
      message: "Event found successfully",
      event: {
        name: string,
        imageUrl: string,
        eventTypes: string[],
        activityHours: number,
        startTime: Date,
        endTime: Date,
        location: string,
        totalSeats: number,
        participantsCount: number,
        description: string,
        isActive: boolean,
        participants: {
          _id: string,
          name: string,
          profilePictureUrl: string,
        }[]
        userHasJoinedEvent: boolean,
      }
    }
 */
router.get("/:id", async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // find event
    const event = await findAndPopulateEvent(id, {
      participants: true,
      eventTypes: true,
    });

    // find user (if signed in)
    const token = req.get("Authorization");
    const user = token ? await findUserWithAuth0Id(getAuth0Id(token)) : null;

    // find active participants
    const participants = toArray(event.participants);
    const activeParticipants = participants.filter(
      (participation) => participation.isActive
    );
    const eventTypes = toArray(event.eventTypes).map(
      (eventType) => eventType.name
    );

    const userHasJoinedEvent = user
      ? activeParticipants.find(
          (participation) =>
            participation.user._id.toString() === user._id.toString()
        )
      : false;

    const eventJson = {
      name: event.name,
      imageUrl: event.imageUrl,
      eventTypes: eventTypes,
      activityHours: event.activityHours,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      totalSeats: event.totalSeats,
      participantsCount: activeParticipants.length,
      description: event.description,
      isActive: event.isActive,
      participants: activeParticipants.map((participation) => {
        return {
          _id: participation.user._id,
          name: participation.user.username,
          profilePictureUrl: participation.user.profilePictureUrl,
          isSelf: user
            ? user._id.toString() === participation.user._id.toString()
            : false,
        };
      }),
      // check if (signed in/self) user has joined this event
      userHasJoinedEvent: Boolean(userHasJoinedEvent),
    };

    res.status(200).send({
      message: "Event found successfully",
      event: eventJson,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route get /api/events/:id/edit
 * :id = event's _id
 * finds an event in the database and returns information for editing
 * 
 * requirements:
 * - params: {
      id: string;
    }
 * 
 * results:
 * {
      message: "Event found successfully",
      event: {
        name: string,
        imageUrl: string,
        eventTypes: string[],
        startTime: Date,
        endTime: Date,
        location: string,
        activityHours: number,
        totalSeats: number,
        description: string,
      }
    }
 */
router.get("/:id/edit", checkAccessToken, checkAdminRole, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    const event = await findAndPopulateEvent(id, {
      eventTypes: true,
    });

    const eventTypes = toArray(event.eventTypes).map(
      (eventType) => eventType.name
    );

    const eventJson = {
      name: event.name,
      imageUrl: event.imageUrl,
      eventTypes: eventTypes,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      activityHours: event.activityHours,
      totalSeats: event.totalSeats,
      description: event.description,
    };

    res.status(200).send({
      message: "Event found successfully",
      event: eventJson,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/events/:id/edit
 * :id = event's _id
 * edits an event in the database
 * 
 * requirements:
 * - authorization: Bearer <access_token>
 * - auth0 role: Admin
 * - params: {
      id: string;
    }
 * - body: {
      event: {
        name?: string;
        image?: {
          url?: string;
          base64Image?: string;
        };
        eventTypes?: string[];
        startTime?: number;
        endTime?: number;
        location?: string;
        activityHours?: number;
        totalSeats?: number;
        description?: string;
      };
    } 
 * 
 * results:
 * {
      message: "Event updated successfully",
    }
 * 

 */
router.post("/:id/edit", checkAccessToken, checkAdminRole, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  // body
  const body: {
    event: {
      name?: string;
      image?: {
        url?: string;
        base64Image?: string;
      };
      eventTypes?: string[];
      startTime?: number;
      endTime?: number;
      location?: string;
      activityHours?: number;
      totalSeats?: number;
      description?: string;
    };
  } = req.body;

  try {
    // get user id from token
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);
    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // find event with this id
    const event = await findEventWithId(id);
    if (!event) {
      res.status(404).send({
        error: "Event not found",
      });
      return;
    }

    // get event types ids
    const eventTypes = body.event.eventTypes
      ? await getEventTypesFromStrings(body.event.eventTypes)
      : [];
    const eventTypeIds =
      eventTypes.length > 0
        ? eventTypes.map((eventType) => eventType!._id)
        : [];

    const eventJson: any = {
      name: body.event.name,
      eventTypes: eventTypeIds,
      location: body.event.location,
      activityHours: body.event.activityHours,
      totalSeats: body.event.totalSeats,
      description: body.event.description,
    };

    if (body.event.startTime) {
      eventJson.startTime = new Date(body.event.startTime);
    }
    if (body.event.endTime) {
      eventJson.endTime = new Date(body.event.endTime);
    }

    if (body.event.image) {
      let imageUrl = await getImageUrl(
        body.event.image,
        user._id.toString(),
        event._id.toString()
      );
      eventJson.imageUrl = imageUrl;
    }

    await updateEvent(event._id.toString(), eventJson);

    res.status(200).send({
      message: "Event updated successfully",
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/events/:id/join
 * :id = event's _id
 * joins an event
 * 
 * requirements:
 * - authorization: Bearer <access_token>
 * - params: {
      id: string;
    }
 * 
 * results:
 * {
      message: "Event joined successfully",
      participation: participation._id,
    }
 * 
 */
router.post("/:id/join", checkUserRole, checkAccessToken, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // get user id from token
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);
    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // find event with this id
    const event = await findEventWithId(id);
    if (!event) {
      res.status(404).send({
        error: "Event not found",
      });
      return;
    }

    // check if event is active
    if (!event.isActive) {
      res.status(400).send({
        error: "Event is not active",
      });
      return;
    }

    // check if user already joined
    await user.populate("joinedEvents");
    const userParticipations = toArray(user.joinedEvents);
    const joinedParticipations = userParticipations.filter((participation) => {
      return (
        // find participation with this event id
        participation.event.toString() === event._id.toString() &&
        // check if participation is active
        participation.isActive
      );
    });

    if (joinedParticipations.length > 0) {
      res.status(400).send({
        error: "User already joined this event",
      });
      return;
    }

    // check if event is full
    if (joinedParticipations.length >= event.totalSeats) {
      res.status(400).send({
        error: "Event is full",
      });
      return;
    }

    // add participation
    const participation = new Participation({
      user: user._id,
      event: event._id,
    });

    await participation.save();

    // link participation to the event and the user
    const eventParticipants = toArray(event.participants);
    eventParticipants.push(participation._id);
    await event.updateOne({
      participants: eventParticipants,
    });

    user.depopulate("joinedEvents");
    const userJoinedEvents = toArray(user.joinedEvents);
    userJoinedEvents.push(participation._id);
    await user.updateOne({
      joinedEvents: userJoinedEvents,
    });

    res.status(200).send({
      message: "Event joined successfully",
      participation: participation._id,
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

/**
 * @route post /api/events/:id/leave
 * :id = event's _id
 * leaves an event
 * 
 * requirements:
 * - authorization: Bearer <access_token>
 * - params: {
      id: string;
    }
 * 
 * results:
 * {
      message: "Event left successfully",
    }
 * 
 */
router.post("/:id/leave", checkUserRole, checkAccessToken, async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    // get user id from token
    const token = req.get("Authorization");
    const auth0id = getAuth0Id(token!);
    const user = await findUserWithAuth0Id(auth0id);
    if (!user) {
      res.status(404).send({
        error: "User not found",
      });
      return;
    }

    // find event with this id
    const event = await findEventWithId(id);
    if (!event) {
      res.status(404).send({
        error: "Event not found",
      });
      return;
    }

    // check if user already joined the event
    await user.populate("joinedEvents");
    const userParticipations = toArray(user.joinedEvents);
    const joinedParticipations = userParticipations.filter((participation) => {
      return (
        // find participation with this event id
        participation.event.toString() === event._id.toString() &&
        // check if participation is active
        participation.isActive
      );
    });

    if (joinedParticipations.length <= 0) {
      res.status(400).send({
        error: "User hasn't joined this event",
      });
      return;
    }

    // deactivate participation
    // safety measure - if there's SOMEHOW multiple active participations
    // deactivate all of them
    for (const participation of joinedParticipations) {
      await participation.updateOne({
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    res.status(200).send({
      message: "Event left successfully",
    });
  } catch (e: any) {
    // handle errors
    console.error(e);
    res.status(400).send(e);
  }
});

export { router as eventRouter };
