import { Router } from "express";
import { checkAdminRole, checkJwt } from "../middleware/auth.ts";
import { getEventTypesFromStrings } from "../services/eventtypes.ts";
import { findUserWithAuth0Id, getAuth0Id } from "../services/users.ts";
import { encryptPassword } from "../services/bcrypt.ts";
import { signIn, signOut, uploadEventPicture } from "../services/firebase.ts";
import {
  createEvent,
  findAndPopulateEvent,
  getEvents,
  updateEvent,
} from "../services/events.ts";
import { EVENT_SORT_TYPES } from "../helper/constants.ts";
import { toArray } from "../services/mongoose.ts";

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
router.post("/create", checkJwt, checkAdminRole, async (req, res) => {
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

    let imageUrl: string | undefined = undefined;
    // if profile picture is sent as url, use that
    if (body.event.image.url) {
      imageUrl = body.event.image.url;
    } else if (body.event.image.base64Image) {
      // if profile picture is sent as base64 encoded image
      // upload it to firebase and use that
      const passwordObj = await encryptPassword(auth0id, user.firebaseSalt);
      await signIn(user.email, passwordObj.password);
      imageUrl = await uploadEventPicture(
        event._id.toString(),
        body.event.image.base64Image
      );
      await signOut();
    }

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
        eventTypes: EventType[],
        startTime: Date,
        endTime: Date,
        location: string,
        totalSeats: number,
        participantsCount: number,
        description: string,
        participants: {
          _id: string,
          name: string,
          profilePictureUrl: string,
        }[]
      }
    }
 */
router.get("/:id", async (req, res) => {
  // get id from url params
  const id = req.params.id;

  try {
    const event = await findAndPopulateEvent(id, {
      participants: true,
      eventTypes: true,
    });

    const participants = toArray(event.participants);

    const eventJson = {
      name: event.name,
      eventTypes: event.eventTypes,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      totalSeats: event.totalSeats,
      participantsCount: participants.length,
      description: event.description,
      participants: participants.map((participation) => {
        return {
          _id: participation._id,
          name: participation.user.username,
          profilePictureUrl: participation.user.profilePictureUrl,
        };
      }),
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
        eventTypes: EventType[],
        startTime: Date,
        endTime: Date,
        location: string,
        totalSeats: number,
        participantsCount: number,
        description: string,
      }
    }
 */
    router.get("/:id/edit", async (req, res) => {
      // get id from url params
      const id = req.params.id;
    
      try {
        const event = await findAndPopulateEvent(id, {
          participants: true,
          eventTypes: true,
        });
    
        const participants = toArray(event.participants);
    
        const eventJson = {
          name: event.name,
          eventTypes: event.eventTypes,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          totalSeats: event.totalSeats,
          participantsCount: participants.length,
          description: event.description,
          participants: participants.map((participation) => {
            return {
              _id: participation._id,
              name: participation.user.username,
              profilePictureUrl: participation.user.profilePictureUrl,
            };
          }),
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

export { router as eventRouter };
