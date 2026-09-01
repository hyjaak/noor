import { NextResponse } from "next/server";
import { prayerTimes } from "../../../../packages/config/prayerTimes";
import { requireCurrentUser } from "../../../lib/current-user";
import { prisma } from "../../../lib/prisma";
import { apiError } from "../../../lib/api-errors";
import { DAILY_PRAYERS, formatCountdown, formatPrayerTime, getPrayerWindow } from "../../../lib/prayer-utils";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const schedule = prayerTimes.calculate(
      {
        latitude: user.settings?.latitude ?? 40.7128,
        longitude: user.settings?.longitude ?? -74.006,
      },
      now,
      {
        method: user.settings?.calculationMethod,
        madhab: user.settings?.madhab,
        offsets: (user.settings?.prayerOffsets as Record<string, number>) ?? undefined,
      },
    );
    const window = getPrayerWindow(schedule.times, now);
    const nextDisplay = formatPrayerTime(schedule.times[window.next.name]);
    const completedToday = await prisma.prayerEvent.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(today) },
        prayer: { in: [...DAILY_PRAYERS] },
      },
    });

    return NextResponse.json({
      status: "real",
      data: {
        ...schedule,
        location: user.settings?.location ?? "New York, NY",
        nextPrayer: {
          name: window.next.name,
          time: nextDisplay.time,
          period: nextDisplay.period,
          countdown: formatCountdown(window.next.at, now),
          at: window.next.at.toISOString(),
        },
        previousPrayer: {
          name: window.previous.name,
          at: window.previous.at.toISOString(),
        },
        progress: window.progress,
        completedToday,
        totalPrayers: DAILY_PRAYERS.length,
        latitude: user.settings?.latitude ?? 40.7128,
        longitude: user.settings?.longitude ?? -74.006,
        locationSet: user.settings?.locationSet ?? false,
        prayerOffsets: user.settings?.prayerOffsets ?? {},
        silence: {
          enabled: user.settings?.silenceEnabled ?? true,
          windowMinutes: user.settings?.silenceWindowMinutes ?? 15,
        },
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
