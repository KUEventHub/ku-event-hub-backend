import EventType from "../schema/EventType.ts";

export async function getEventTypesFromStrings(eventTypes: string[]) {
  const eventTypesObjects = await Promise.all(
    eventTypes.map(async (eventType) => {
      const foundEventType = await EventType.findOne({
        name: eventType,
      });
      return foundEventType;
    })
  );

  console.log(eventTypesObjects);
  
  return eventTypesObjects;
}