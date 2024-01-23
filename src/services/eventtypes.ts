import EventType from "../schema/EventType.ts";

/**
 * Find event types in the database and returns it.
 * 
 * @param eventTypes event types as strings
 * @returns `EventType[]` object
 */
export async function getEventTypesFromStrings(eventTypes: string[]) {
  const eventTypesObjects = await Promise.all(
    eventTypes.map(async (eventType) => {
      const foundEventType = await EventType.findOne({
        name: eventType,
      });
      return foundEventType;
    })
  );

  return eventTypesObjects;
}


