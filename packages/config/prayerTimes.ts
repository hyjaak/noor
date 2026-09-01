import {
  Coordinates as AdhanCoordinates,
  CalculationMethod,
  CalculationParameters,
  HighLatitudeRule,
  Madhab,
  PrayerTimes as AdhanPrayerTimes,
  Qibla,
} from "adhan";

export type Coordinates = { latitude: number; longitude: number };
export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type PrayerOffsets = Partial<Record<PrayerName, number>>;

const METHODS: Record<string, () => CalculationParameters> = {
  MWL: CalculationMethod.MuslimWorldLeague,
  Egyptian: CalculationMethod.Egyptian,
  Karachi: CalculationMethod.Karachi,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Dubai: CalculationMethod.Dubai,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  NorthAmerica: CalculationMethod.NorthAmerica,
  Kuwait: CalculationMethod.Kuwait,
  Qatar: CalculationMethod.Qatar,
  Singapore: CalculationMethod.Singapore,
  Tehran: CalculationMethod.Tehran,
  Turkey: CalculationMethod.Turkey,
};

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

// Times are formatted using the runtime's local clock. Without a timezone
// database keyed to lat/lng, this assumes the server/browser clock matches
// the user's local time zone -- the same assumption the placeholder this
// replaces relied on.
function format(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const prayerTimes = {
  calculate(
    coordinates: Coordinates,
    date = new Date(),
    options?: { method?: string; madhab?: string; offsets?: PrayerOffsets },
  ) {
    const coords = new AdhanCoordinates(coordinates.latitude, coordinates.longitude);
    const params = (METHODS[options?.method ?? "MWL"] ?? CalculationMethod.MuslimWorldLeague)();
    params.madhab = options?.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
    // Applies MiddleOfTheNight/SeventhOfTheNight for latitudes where twilight
    // never occurs (adhan's own recommendation), instead of leaving Fajr/Isha
    // unadjusted at extreme latitudes.
    params.highLatitudeRule = HighLatitudeRule.recommended(coords);

    const offsets = options?.offsets ?? {};
    params.adjustments = {
      fajr: offsets.Fajr ?? 0,
      sunrise: offsets.Sunrise ?? 0,
      dhuhr: offsets.Dhuhr ?? 0,
      asr: offsets.Asr ?? 0,
      maghrib: offsets.Maghrib ?? 0,
      isha: offsets.Isha ?? 0,
    };

    const times = new AdhanPrayerTimes(coords, date, params);

    return {
      location: coordinates,
      date: date.toISOString().slice(0, 10),
      method: options?.method ?? "MWL",
      madhab: options?.madhab ?? "shafii",
      highLatitudeRule: params.highLatitudeRule,
      times: {
        Fajr: format(times.fajr),
        Sunrise: format(times.sunrise),
        Dhuhr: format(times.dhuhr),
        Asr: format(times.asr),
        Maghrib: format(times.maghrib),
        Isha: format(times.isha),
      },
    };
  },

  qiblaBearing(coordinates: Coordinates): number {
    return Qibla(new AdhanCoordinates(coordinates.latitude, coordinates.longitude));
  },
};
