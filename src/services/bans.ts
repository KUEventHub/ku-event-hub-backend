import BanLog from "../schema/BanLog.ts";

/**
 * checks if there are any bans that are active
 * but have already ended and updates them
 */
export async function checkActiveBans() {
  const now = new Date();

  const bans = await BanLog.find({
    endTime: { $lt: now },
    isActive: true,
  });

  for (const ban of bans) {
    await ban.updateOne({
      isActive: false,
      updatedAt: Date.now(),
    });
  }
}
