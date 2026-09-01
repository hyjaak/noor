import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prayerTimes } from "../../../../packages/config/prayerTimes";
import { requireCurrentUser } from "../../../lib/current-user";
import { prisma } from "../../../lib/prisma";
import { apiError } from "../../../lib/api-errors";
import { DAILY_PRAYERS, formatCountdown, formatPrayerTime, getPrayerWindow } from "../../../lib/prayer-utils";

// Starts a Salah Mode session -- one PrayerEvent row per session, checkpoints
// accumulate into it via PATCH below rather than one row per rakah.
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as { prayer: string; rakahCount?: number };
    const data = await prisma.prayerEvent.create({
      data: {
        userId: user.id,
        prayer: body.prayer,
        rakahCount: body.rakahCount ?? null,
        completed: false,
        payload: { checkpoints: [] } as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ status: "real", data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

// Appends a rakah checkpoint and/or marks the session complete. Read-modify-
// write on the small `payload.checkpoints` array -- this table has no
// concurrent-writer scenario (one user, one active Salah Mode session).
export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as {
      id: string;
      checkpoint?: { rakah: number; surah: number; ayah: number };
      completed?: boolean;
    };
    const existing = await prisma.prayerEvent.findUnique({ where: { id: body.id } });
    if (!existing || existing.userId !== user.id) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    const payload = (existing.payload as { checkpoints?: unknown[] }) ?? {};
    const checkpoints = Array.isArray(payload.checkpoints) ? payload.checkpoints : [];
    if (body.checkpoint) checkpoints.push(body.checkpoint);
    const data = await prisma.prayerEvent.update({
      where: { id: body.id },
      data: {
        payload: { ...payload, checkpoints } as Prisma.InputJsonValue,
        completed: body.completed ?? existing.completed,
      },
    });
    return NextResponse.json({ status: "real", data });
  } catch (error) {
    return apiError(error);
  }
}

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
