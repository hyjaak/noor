import { NextResponse } from "next/server";
import { prayerTimes } from "../../../../packages/config/prayerTimes";
import { requireCurrentUser } from "../../../lib/current-user";
import { apiError } from "../../../lib/api-errors";
export async function GET() {
  try {
    const user = await requireCurrentUser();
    const latitude = user.settings?.latitude ?? 40.7128;
    const longitude = user.settings?.longitude ?? -74.006;
    return NextResponse.json({
      status: "real",
      data: {
        location: user.settings?.location,
        latitude,
        longitude,
        locationSet: user.settings?.locationSet ?? false,
        bearing: prayerTimes.qiblaBearing({ latitude, longitude }),
        unit: "degrees from true north",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
