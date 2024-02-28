import Event from "../schema/Event.ts";
import { toArray } from "../services/mongoose.ts";

/**
 * event type names
 */
const EVENT_TYPES = [
  {
    name: "กิจกรรมมหาวิทยาลัย",
    children: [],
  },
  {
    name: "กิจกรรมเพื่อเสริมสร้างสมรรถนะ",
    children: [
      "ด้านพัฒนาคุณธรรมจริยธรรม",
      "ด้านพัฒนาทักษะการคิดและการเรียนรู้",
      "เสริมสร้างความสัมพันธ์ระหว่างบุคคลและการสื่อสาร",
      "ด้านพัฒนาสุขภาพ",
    ],
  },
  {
    name: "กิจกรรมเพื่อสังคม",
    children: [],
  },
];

/**
 * Formats event summary.
 * @param eventSummary the event summary
 * @returns formatted event summary
 */
export async function formatEventSummary(
  eventSummary: {
    name: string;
    count: number;
    hours: number;
    events: any[]; // WAY TOO MUCH TO LIST
  }[]
) {
  return await Promise.all(
    EVENT_TYPES.map(async (eventType) => {
      const formattedSummary: {
        name: string;
        count: number;
        hours: number;
        children: {
          events?: any[];
          subtype?: {
            name: string;
            count: number;
            hours: number;
            events: any[];
          }[];
        };
      } = {
        name: eventType.name,
        count: 0,
        hours: 0,
        children: {},
      };

      // find event summary with the same name
      const summary = eventSummary.find((s) => s.name === eventType.name);

      if (!summary) {
        return null;
      }

      // check if event type has children
      if (eventType.children.length > 0) {
        formattedSummary.children.subtype = [];

        for (const subtype of eventType.children) {
          const subtypeSummary = eventSummary.find((s) => s.name === subtype);

          // already calculated from outside
          if (subtypeSummary) {
            formattedSummary.count += subtypeSummary.count;
            formattedSummary.hours += subtypeSummary.hours;
          }

          // format the raw events
          const formattedEvents = [];
          const events = subtypeSummary ? subtypeSummary.events : [];

          for (const event of events) {
            formattedEvents.push(await formatEvent(event));
          }

          formattedSummary.children.subtype!.push({
            name: subtype,
            count: subtypeSummary?.count || 0,
            hours: subtypeSummary?.hours || 0,
            events: formattedEvents,
          });
        }
      } else {
        // if not, add to formatted summary
        formattedSummary.count = summary.count || 0;
        formattedSummary.hours = summary.hours || 0;
        formattedSummary.children.events = await Promise.all(
          summary.events.map(async (event) => await formatEvent(event))
        );
      }

      return formattedSummary;
    })
  );
}

/**
 * Formats an event.
 * @param event unformatted event (preferably the one you just pulled of db)
 * @returns formatted event, obviously
 */
async function formatEvent(event: any) {
  const populatedEvent = await Event.populate(event, "participants");
  const activeParticipants = toArray(populatedEvent.participants).filter(
    (p: any) => p.isActive
  );

  return {
    id: event._id,
    name: event.name,
    imageUrl: event.imageUrl,
    activityHours: event.activityHours,
    totalSeats: event.totalSeats,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    description: event.description,
    isActive: event.isActive,
    isDeactivated: event.isDeactivated,
    participantsCount: activeParticipants.length,
    eventTypes: event.eventTypes,
  };
}
