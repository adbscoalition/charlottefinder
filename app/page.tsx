"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Coordinates = {
  lat: number;
  lon: number;
};

type MagneticSource = {
  name: string;
  category: "regular" | "secret";
  center: Coordinates;
  bands: Array<{
    startKm: number;
    endKm: number;
    startValue: number;
    endValue: number;
  }>;
};

type CompassTarget = {
  label: string;
  center: Coordinates;
};


type UploadedSecretField = {
  id: string;
  name: string;
  center: Coordinates;
  maxIntensity: number;
  maxRangeMeters: number;
  visibility: "public" | "private";
  startTime: string;
  endTime: string;
};

const CUSTOM_FIELD_STORAGE_KEY = "clt-custom-secret-fields-storage";
const MAX_UPLOADED_INTENSITY = 50000;
const MAX_UPLOADED_RANGE_METERS = 100;

const CHARLOTTE: Coordinates = { lat: 35.22867647481079, lon: -80.84490976473366 };
const EASTER_EGG: Coordinates = { lat: 49.2729341959022, lon: -123.06941193669999 };
const CHARLOTTE_MI: Coordinates = { lat: 42.56318196348821, lon: -84.83584647437215 };
const PACIFIC_FIELD: Coordinates = { lat: 53.255510249854304, lon: -132.08947116604432 };
const CARIBBEAN_FIELD: Coordinates = { lat: 18.34185490966226, lon: -64.9316281681369 };
const PORT_CHARLOTTE_FL: Coordinates = { lat: 27.010523765938274, lon: -82.14259591632731 };
const CHARLOTTETOWN_PEI: Coordinates = { lat: 46.23722371252871, lon: -63.12970137942366 };
const VANCOUVER_MICRO_SECRET: Coordinates = { lat: 49.27295878743672, lon: -123.06939862529713 };
const CHARLOTTESVILLE_VA: Coordinates = { lat: 38.0292848205594, lon: -78.47616344837674 };
const QUEEN_CHARLOTTE_BURIAL_PLACE: Coordinates = { lat: 51.4836838439432, lon: -0.60668429494321 };

const COMPASS_TARGETS: CompassTarget[] = [
  { label: "Charlotte, NC", center: CHARLOTTE },
  { label: "Charlotte, MI", center: CHARLOTTE_MI },
  { label: "Haida Gwaii Islands", center: PACIFIC_FIELD },
  { label: "Charlotte Amalie, US Virgin Islands", center: CARIBBEAN_FIELD },
  { label: "Port Charlotte, FL", center: PORT_CHARLOTTE_FL },
  { label: "Charlottetown, PEI", center: CHARLOTTETOWN_PEI },
  { label: "Charlottesville, VA", center: CHARLOTTESVILLE_VA },
  { label: "Queen Charlotte Burial Place", center: QUEEN_CHARLOTTE_BURIAL_PLACE }
];

const MAGNETIC_SOURCES: MagneticSource[] = [
  {
    name: "Charlotte, NC",
    category: "regular",
    center: CHARLOTTE,
    bands: [
      { startKm: 0, endKm: 10, startValue: 1000, endValue: 1000 },
      { startKm: 10, endKm: 100, startValue: 1000, endValue: 200 },
      { startKm: 100, endKm: 200, startValue: 200, endValue: 50 },
      { startKm: 200, endKm: 400, startValue: 50, endValue: 10 },
      { startKm: 400, endKm: 1000, startValue: 10, endValue: 0 }
    ]
  },
  {
    name: "Vancouver Easter Egg",
    category: "secret",
    center: EASTER_EGG,
    bands: [
      { startKm: 0, endKm: 0.01, startValue: 15000, endValue: 15000 },
      { startKm: 0.01, endKm: 0.1, startValue: 15000, endValue: 500 },
      { startKm: 0.1, endKm: 1, startValue: 500, endValue: 20 },
      { startKm: 1, endKm: 5, startValue: 20, endValue: 0 }
    ]
  },
  {
    name: "Charlotte, MI",
    category: "regular",
    center: CHARLOTTE_MI,
    bands: [
      { startKm: 0, endKm: 2, startValue: 575, endValue: 575 },
      { startKm: 2, endKm: 10, startValue: 575, endValue: 200 },
      { startKm: 10, endKm: 40, startValue: 200, endValue: 30 },
      { startKm: 40, endKm: 120, startValue: 30, endValue: 0 }
    ]
  },
  {
    name: "Pacific Field",
    category: "regular",
    center: PACIFIC_FIELD,
    bands: [
      { startKm: 0, endKm: 200, startValue: 230, endValue: 230 },
      { startKm: 200, endKm: 350, startValue: 230, endValue: 20 },
      { startKm: 350, endKm: 450, startValue: 20, endValue: 0 }
    ]
  },
  {
    name: "Caribbean Field",
    category: "regular",
    center: CARIBBEAN_FIELD,
    bands: [
      { startKm: 0, endKm: 1, startValue: 300, endValue: 300 },
      { startKm: 1, endKm: 10, startValue: 300, endValue: 100 },
      { startKm: 10, endKm: 25, startValue: 100, endValue: 20 },
      { startKm: 25, endKm: 40, startValue: 20, endValue: 0 }
    ]
  },
  {
    name: "Port Charlotte, FL",
    category: "regular",
    center: PORT_CHARLOTTE_FL,
    bands: [
      { startKm: 0, endKm: 3, startValue: 400, endValue: 400 },
      { startKm: 3, endKm: 10, startValue: 400, endValue: 100 },
      { startKm: 10, endKm: 30, startValue: 100, endValue: 12 },
      { startKm: 30, endKm: 100, startValue: 12, endValue: 0 }
    ]
  },
  {
    name: "Charlottetown, PEI",
    category: "regular",
    center: CHARLOTTETOWN_PEI,
    bands: [
      { startKm: 0, endKm: 2, startValue: 350, endValue: 350 },
      { startKm: 2, endKm: 8, startValue: 350, endValue: 100 },
      { startKm: 8, endKm: 24, startValue: 100, endValue: 25 },
      { startKm: 24, endKm: 128, startValue: 25, endValue: 0 }
    ]
  },

  {
    name: "Charlottesville, VA",
    category: "regular",
    center: CHARLOTTESVILLE_VA,
    bands: [
      { startKm: 0, endKm: 3, startValue: 450, endValue: 450 },
      { startKm: 3, endKm: 30, startValue: 450, endValue: 200 },
      { startKm: 30, endKm: 120, startValue: 200, endValue: 20 },
      { startKm: 120, endKm: 360, startValue: 20, endValue: 0 }
    ]
  },
  {
    name: "Queen Charlotte Burial Place",
    category: "secret",
    center: QUEEN_CHARLOTTE_BURIAL_PLACE,
    bands: [
      { startKm: 0, endKm: 0.1, startValue: 14000, endValue: 14000 },
      { startKm: 0.1, endKm: 1, startValue: 14000, endValue: 3000 },
      { startKm: 1, endKm: 3, startValue: 3000, endValue: 900 },
      { startKm: 3, endKm: 14, startValue: 900, endValue: 200 },
      { startKm: 14, endKm: 50, startValue: 200, endValue: 40 },
      { startKm: 50, endKm: 250, startValue: 40, endValue: 0 }
    ]
  },
  {
    name: "Vancouver Micro Secret",
    category: "secret",
    center: VANCOUVER_MICRO_SECRET,
    bands: [
      { startKm: 0, endKm: 0.001, startValue: 300000, endValue: 300000 },
      { startKm: 0.001, endKm: 0.01, startValue: 300000, endValue: 1 },
      { startKm: 0.01, endKm: 0.015, startValue: 1, endValue: 0 }
    ]
  }
];

const LOCATION_PASSWORD = "67416741";
const VANCOUVER_WEAKENED_BANDS: MagneticSource["bands"] = [
  { startKm: 0, endKm: 0.01, startValue: 5000, endValue: 5000 },
  { startKm: 0.01, endKm: 0.1, startValue: 5000, endValue: 100 },
  { startKm: 0.1, endKm: 0.5, startValue: 100, endValue: 10 },
  { startKm: 0.5, endKm: 2.5, startValue: 10, endValue: 0 }
];

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

function distanceKm(a: Coordinates, b: Coordinates) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}


function bearingDeg(from: Coordinates, to: Coordinates) {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function magneticValueFromBands(distance: number, bands: MagneticSource["bands"]) {
  for (const band of bands) {
    if (distance <= band.endKm) {
      if (band.endKm === band.startKm) return band.endValue;
      const t = Math.min(Math.max((distance - band.startKm) / (band.endKm - band.startKm), 0), 1);
      return lerp(band.startValue, band.endValue, t);
    }
  }
  return 0;
}

function formatField(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

type Rgb = { r: number; g: number; b: number };

const BACKGROUND_STOPS: Array<{ value: number; color: string }> = [
  { value: 0, color: "#020617" },
  { value: 50, color: "#1f2937" },
  { value: 200, color: "#334155" },
  { value: 1001, color: "#854d0e" },
  { value: 5000, color: "#7f1d1d" },
  { value: 14000, color: "#312e81" },
  { value: 15000, color: "#1d4ed8" }
];

const FIELD_NUMBER_STOPS: Array<{ value: number; color: string }> = [
  { value: 0, color: "#9ca3af" },
  { value: 50, color: "#d1d5db" },
  { value: 200, color: "#ffffff" },
  { value: 1001, color: "#facc15" },
  { value: 14000, color: "#93c5fd" },
  { value: 15000, color: "#2563eb" }
];

const PULSE_RING_STOPS: Array<{ value: number; color: string }> = [
  { value: 0, color: "#9ca3af" },
  { value: 50, color: "#ffffff" },
  { value: 200, color: "#facc15" },
  { value: 1001, color: "#f97316" },
  { value: 5000, color: "#ef4444" },
  { value: 14000, color: "#a855f7" },
  { value: 15000, color: "#2563eb" }
];


const BACKDROP_PARTICLES = [
  { symbol: "✦", top: "8%", left: "12%", delay: "0s" },
  { symbol: "♥", top: "16%", left: "78%", delay: "0.9s" },
  { symbol: "★", top: "30%", left: "24%", delay: "0.4s" },
  { symbol: "✦", top: "38%", left: "88%", delay: "1.3s" },
  { symbol: "♥", top: "56%", left: "10%", delay: "0.7s" },
  { symbol: "★", top: "70%", left: "72%", delay: "1.6s" },
  { symbol: "✦", top: "82%", left: "36%", delay: "0.2s" },
  { symbol: "♥", top: "88%", left: "92%", delay: "1.1s" }
];

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function mixRgb(start: Rgb, end: Rgb, t: number): Rgb {
  return {
    r: Math.round(lerp(start.r, end.r, t)),
    g: Math.round(lerp(start.g, end.g, t)),
    b: Math.round(lerp(start.b, end.b, t))
  };
}

function rgbToCss(rgb: Rgb, alpha = 1) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function colorFromStops(value: number, stops: Array<{ value: number; color: string }>) {
  const clampedValue = Math.max(value, 0);

  if (clampedValue <= stops[0].value) {
    return hexToRgb(stops[0].color);
  }

  const upperStop = stops.find((stop) => clampedValue <= stop.value) ?? stops[stops.length - 1];
  const upperIndex = stops.indexOf(upperStop);
  const lowerStop = stops[Math.max(upperIndex - 1, 0)];
  const span = Math.max(upperStop.value - lowerStop.value, 1);
  const t = Math.min(Math.max((clampedValue - lowerStop.value) / span, 0), 1);

  return mixRgb(hexToRgb(lowerStop.color), hexToRgb(upperStop.color), t);
}

function regularFieldMessage(value: number) {
  if (value <= 0) return "You're not near any Charlotte.";
  if (value < 20) return "You feel a presence of Charlotte...";
  if (value < 50) return "You are nearing a Charlotte...";
  if (value < 200) return "You are near a Charlotte!";
  if (value < 800) return "You are at a CHARLOTTE!!!!";
  return "Welcome to the QUEEN CITY!!!";
}

function secretFieldMessage(value: number) {
  if (value >= 200000) return "THE MODERN SACREDS OF CHARLOTTES";
  if (value <= 0) return "";
  if (value < 10) return "A magnetic field?";
  if (value < 50) return "This shouldn't be here...";
  if (value < 300) return "Why is it spiking??!?!";
  if (value < 4000) return "ITS SPIKING AHH CHARLOTTE";
  if (value < 14000) return "THE HOLY CHARLOTTE!!!!";
  return "CHARLOTTE CHARLOTTE CHARLOTTE";
}


function queenCharlotteFieldMessage(value: number) {
  if (value <= 0) return "";
  if (value < 40) return "Charlotte..?";
  if (value < 200) return "The 1780 queen…";
  if (value < 900) return "Queen Charlotte…?";
  if (value < 11000) return "QUEEN CHARLOTTE!!!!!!";
  if (value < 12200) return "CHARLOTTE OF MECKLENBURG-STRELITZ";
  if (value < 13300) return "Fun Fact: in 1780 her CLT Magnetic was 1.5 MILLION!!!!!!!";
  return "THE TRUE. GOD. OF. ALL. CHARLOTTES!";
}

function getTimeZoneTotalMinutes(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const second = Number(parts.find((part) => part.type === "second")?.value ?? "0");
  return hour * 60 + minute + second / 60;
}

function toRangeProgress(value: number, start: number, end: number) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

function isMicroSecretToggleWindow(timeZone: string, now = new Date()) {
  const totalMinutes = getTimeZoneTotalMinutes(timeZone, now);
  return totalMinutes >= 19 * 60 || totalMinutes < 10 * 60;
}

function microSecretScheduledMultiplier(timeZone: string, now = new Date()) {
  const totalMinutes = getTimeZoneTotalMinutes(timeZone, now);

  if (totalMinutes < 9 * 60 + 58) return 0;
  if (totalMinutes < 10 * 60 + 3) {
    return toRangeProgress(totalMinutes, 9 * 60 + 58, 10 * 60 + 3);
  }
  if (totalMinutes < 19 * 60 + 2) return 1;
  if (totalMinutes < 19 * 60 + 7) {
    const fadeProgress = toRangeProgress(totalMinutes, 19 * 60 + 2, 19 * 60 + 7);
    return 1 - fadeProgress;
  }
  return 0;
}

function vancouverWeakeningProgress(timeZone: string, now = new Date()) {
  const totalMinutes = getTimeZoneTotalMinutes(timeZone, now);

  if (totalMinutes >= 19 * 60 + 35 || totalMinutes < 9 * 60 + 27) return 1;
  if (totalMinutes < 9 * 60 + 37) {
    return 1 - toRangeProgress(totalMinutes, 9 * 60 + 27, 9 * 60 + 37);
  }
  if (totalMinutes < 19 * 60 + 25) return 0;
  return toRangeProgress(totalMinutes, 19 * 60 + 25, 19 * 60 + 35);
}

function useCountingValue(targetValue: number, durationMs = 900) {
  const [animatedValue, setAnimatedValue] = useState(targetValue);
  const currentValueRef = useRef(targetValue);

  useEffect(() => {
    const startValue = currentValueRef.current;
    const delta = targetValue - startValue;

    if (Math.abs(delta) < 0.001) {
      currentValueRef.current = targetValue;
      setAnimatedValue(targetValue);
      return;
    }

    const magnitude = Math.max(Math.abs(startValue), Math.abs(targetValue));
    const quantum = magnitude >= 1000 ? 1 : magnitude >= 100 ? 0.1 : 0.01;
    const startTime = performance.now();
    let frameId = 0;

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / durationMs, 1);
      const nextValue = startValue + delta * progress;
      const snappedValue = Math.round(nextValue / quantum) * quantum;

      currentValueRef.current = snappedValue;
      setAnimatedValue(snappedValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      currentValueRef.current = targetValue;
      setAnimatedValue(targetValue);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [targetValue, durationMs]);

  return animatedValue;
}


function parseClockMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function timeWindowMultiplier(nowMinutes: number, startTime: string, endTime: string) {
  const start = parseClockMinutes(startTime);
  const end = parseClockMinutes(endTime);
  if (start === null || end === null) return 1;

  const points = [nowMinutes, nowMinutes + 1440];

  for (const point of points) {
    let localStart = start;
    let localEnd = end;

    if (localEnd <= localStart) {
      localEnd += 1440;
      if (point < localStart) localStart -= 1440;
    }

    if (point >= localStart - 5 && point < localStart) {
      return toRangeProgress(point, localStart - 5, localStart);
    }
    if (point >= localStart && point <= localEnd) {
      return 1;
    }
    if (point > localEnd && point <= localEnd + 5) {
      return 1 - toRangeProgress(point, localEnd, localEnd + 5);
    }
  }

  return 0;
}

function uploadedFieldValue(distanceKm: number, field: UploadedSecretField, timeZone: string, now = new Date()) {
  const yKm = field.maxRangeMeters / 1000;
  const x = field.maxIntensity;

  const bands = [
    { start: 0, end: 1 * yKm, startValue: x, endValue: x },
    { start: 1 * yKm, end: 3 * yKm, startValue: x, endValue: 0.2 * x },
    { start: 3 * yKm, end: 8 * yKm, startValue: 0.2 * x, endValue: 0.05 * x },
    { start: 8 * yKm, end: 15 * yKm, startValue: 0.05 * x, endValue: 0.01 * x },
    { start: 15 * yKm, end: 25 * yKm, startValue: 0.01 * x, endValue: 0 }
  ];

  let value = 0;
  for (const band of bands) {
    if (distanceKm <= band.end) {
      const t = Math.min(Math.max((distanceKm - band.start) / Math.max(band.end - band.start, 1e-6), 0), 1);
      value = lerp(band.startValue, band.endValue, t);
      break;
    }
  }

  if (!field.startTime || !field.endTime) return value;
  const fade = timeWindowMultiplier(getTimeZoneTotalMinutes(timeZone, now), field.startTime, field.endTime);
  return value * fade;
}


function coordinateKey(coords: Coordinates) {
  return `${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}`;
}

async function lookupTimeZone(coords: Coordinates) {
  const response = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${coords.lat}&longitude=${coords.lon}`);
  if (!response.ok) throw new Error(`Time zone lookup failed: ${response.status}`);
  const payload = (await response.json()) as { timeZone?: string };
  return payload.timeZone ?? null;
}

function backgroundFromField(value: number) {
  const base = colorFromStops(value, BACKGROUND_STOPS);
  const top = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.2);
  const bottom = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.55);
  const accent = mixRgb(base, { r: 56, g: 189, b: 248 }, 0.2);

  return `linear-gradient(160deg, ${rgbToCss(top, 0.94)} 0%, ${rgbToCss(bottom, 0.98)} 100%), radial-gradient(circle at 18% 18%, ${rgbToCss(accent, 0.48)} 0%, ${rgbToCss(base, 0)} 58%)`;
}

function shakeStrength(value: number) {
  if (value <= 0) return 0;
  if (value < 1001) return 0.2;
  if (value < 5000) return 0.45;
  if (value < 14000) return 0.8;
  return 1.25;
}

export default function Home() {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [error, setError] = useState("");
  const [hasInitialFix, setHasInitialFix] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [teleportVisible, setTeleportVisible] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [spoofActive, setSpoofActive] = useState(false);

  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simLatInput, setSimLatInput] = useState("");
  const [simLonInput, setSimLonInput] = useState("");
  const [simulatedPosition, setSimulatedPosition] = useState<Coordinates | null>(null);
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);
  const [simulatorPasswordInput, setSimulatorPasswordInput] = useState("");
  const [simulatorUnlocked, setSimulatorUnlocked] = useState(false);
  const [microSecretOfftimeEnabled, setMicroSecretOfftimeEnabled] = useState(false);
  const [uploadedFields, setUploadedFields] = useState<UploadedSecretField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldNameInput, setFieldNameInput] = useState("");
  const [fieldIntensityInput, setFieldIntensityInput] = useState("5000");
  const [fieldRangeInput, setFieldRangeInput] = useState("100");
  const [fieldVisibility, setFieldVisibility] = useState<"public" | "private">("private");
  const [fieldStartTimeInput, setFieldStartTimeInput] = useState("");
  const [fieldEndTimeInput, setFieldEndTimeInput] = useState("");
  const [fieldLatInput, setFieldLatInput] = useState("");
  const [fieldLonInput, setFieldLonInput] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [timeZoneByCoordinate, setTimeZoneByCoordinate] = useState<Record<string, string>>({});

  const audioContextRef = useRef<AudioContext | null>(null);
  const beepAccumulatorRef = useRef(0);
  const beepsPerSecondRef = useRef(0);
  const beepVolumeRef = useRef(0);

  const activePosition = simulatedPosition ?? position;

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(CHARLOTTE);
      setHasInitialFix(true);
      setError("Geolocation is not available. Defaulting to Charlotte, NC.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!spoofActive) {
          setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        }
        setHasInitialFix(true);
        setError("");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          if (!spoofActive) {
            setPosition(CHARLOTTE);
          }
          setHasInitialFix(true);
          setError("Geolocation denied. Defaulting to Charlotte, NC.");
          return;
        }

        setError(err.message);
      },
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [spoofActive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 1200);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_FIELD_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UploadedSecretField[];
      if (Array.isArray(parsed)) setUploadedFields(parsed);
    } catch {
      // ignore malformed storage payloads
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_FIELD_STORAGE_KEY, JSON.stringify(uploadedFields));
  }, [uploadedFields]);

  useEffect(() => {
    const staticTimeZoneCoordinates = [EASTER_EGG, VANCOUVER_MICRO_SECRET];
    const uploadedCoordinates = uploadedFields
      .filter((field) => field.startTime && field.endTime)
      .map((field) => field.center);

    const pending = [...staticTimeZoneCoordinates, ...uploadedCoordinates].filter((coords) => !timeZoneByCoordinate[coordinateKey(coords)]);
    if (pending.length === 0) return;

    let disposed = false;

    const resolveMissingTimeZones = async () => {
      for (const coords of pending) {
        const key = coordinateKey(coords);
        if (timeZoneByCoordinate[key]) continue;

        try {
          const timeZone = await lookupTimeZone(coords);
          if (!timeZone || disposed) continue;

          setTimeZoneByCoordinate((prev) => (prev[key] ? prev : { ...prev, [key]: timeZone }));
        } catch {
          // fallback: keep existing source defaults if lookup fails
        }
      }
    };

    void resolveMissingTimeZones();

    return () => {
      disposed = true;
    };
  }, [timeZoneByCoordinate, uploadedFields]);

  const activeTarget = COMPASS_TARGETS[activeTargetIndex] ?? COMPASS_TARGETS[0];

  const toTarget = useMemo(() => {
    if (!activePosition) return null;
    const distance = distanceKm(activePosition, activeTarget.center);
    const bearing = bearingDeg(activePosition, activeTarget.center);
    return { distance, bearing };
  }, [activePosition, activeTarget]);

  const magneticBreakdown = useMemo(() => {
    if (!activePosition) return [] as Array<{ name: string; value: number; distance: number; category: MagneticSource["category"] }>;

    const now = new Date();
    const vancouverTimeZone = timeZoneByCoordinate[coordinateKey(EASTER_EGG)] ?? "America/Los_Angeles";
    const microSecretMultiplier = microSecretScheduledMultiplier(vancouverTimeZone, now);
    const microSecretActive = microSecretMultiplier > 0 || (isMicroSecretToggleWindow(vancouverTimeZone, now) && microSecretOfftimeEnabled);
    const vancouverWeakening = vancouverWeakeningProgress(vancouverTimeZone, now);

    const baseBreakdown = MAGNETIC_SOURCES.map((source) => {
      const dist = distanceKm(activePosition, source.center);

      if (source.name === "Vancouver Micro Secret") {
        if (!microSecretActive) {
          return { name: source.name, value: 0, distance: Number.POSITIVE_INFINITY, category: source.category };
        }

        const baseValue = magneticValueFromBands(dist, source.bands);
        const value = isMicroSecretToggleWindow(vancouverTimeZone, now) && microSecretOfftimeEnabled ? baseValue : baseValue * microSecretMultiplier;
        return { name: source.name, value, distance: dist, category: source.category };
      }

      if (source.name === "Vancouver Easter Egg") {
        const regularValue = magneticValueFromBands(dist, source.bands);
        const weakenedValue = magneticValueFromBands(dist, VANCOUVER_WEAKENED_BANDS);
        const value = lerp(regularValue, weakenedValue, vancouverWeakening);
        return { name: source.name, value, distance: dist, category: source.category };
      }

      return { name: source.name, value: magneticValueFromBands(dist, source.bands), distance: dist, category: source.category };
    });

    const uploadedBreakdown = uploadedFields.map((field) => {
      const dist = distanceKm(activePosition, field.center);
      return {
        name: `${field.name} (${field.visibility})`,
        value: uploadedFieldValue(dist, field, timeZoneByCoordinate[coordinateKey(field.center)] ?? "UTC", now),
        distance: dist,
        category: "secret" as const
      };
    });

    return [...baseBreakdown, ...uploadedBreakdown].sort((a, b) => b.value - a.value);
  }, [activePosition, microSecretOfftimeEnabled, refreshTick, timeZoneByCoordinate, uploadedFields]);

  const fieldStrength = useMemo(() => magneticBreakdown.reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const regularFieldStrength = useMemo(() => magneticBreakdown.filter((item) => item.category === "regular").reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const secretFieldStrength = useMemo(() => magneticBreakdown.filter((item) => item.category === "secret").reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const fluctuationMultiplier = useMemo(() => 1 + Math.sin(refreshTick * 1.618) * 0.05, [refreshTick]);
  const displayFieldStrength = useMemo(() => Math.max(fieldStrength * fluctuationMultiplier, 0), [fieldStrength, fluctuationMultiplier]);
  const displayRegularStrength = useMemo(() => Math.max(regularFieldStrength * fluctuationMultiplier, 0), [regularFieldStrength, fluctuationMultiplier]);
  const displaySecretStrength = useMemo(() => Math.max(secretFieldStrength * fluctuationMultiplier, 0), [secretFieldStrength, fluctuationMultiplier]);
  const queenCharlotteStrength = useMemo(
    () => magneticBreakdown.find((item) => item.name === "Queen Charlotte Burial Place")?.value ?? 0,
    [magneticBreakdown]
  );
  const displayQueenCharlotteStrength = useMemo(
    () => Math.max(queenCharlotteStrength * fluctuationMultiplier, 0),
    [queenCharlotteStrength, fluctuationMultiplier]
  );
  const animatedFieldStrength = useCountingValue(displayFieldStrength);
  const animatedRegularStrength = useCountingValue(displayRegularStrength);
  const animatedSecretStrength = useCountingValue(displaySecretStrength);
  const animatedQueenCharlotteStrength = useCountingValue(displayQueenCharlotteStrength);
  const statusMessage = useMemo(() => {
    if (animatedQueenCharlotteStrength > 0) return queenCharlotteFieldMessage(animatedQueenCharlotteStrength);
    if (animatedSecretStrength > 0) return secretFieldMessage(animatedSecretStrength);
    return regularFieldMessage(animatedRegularStrength);
  }, [animatedQueenCharlotteStrength, animatedRegularStrength, animatedSecretStrength]);
  const dynamicBackground = useMemo(() => backgroundFromField(animatedFieldStrength), [animatedFieldStrength]);
  const pulsesPerSecond = useMemo(() => {
    if (animatedFieldStrength <= 0) return 0;
    return Math.min(0.8 + animatedFieldStrength / 1100, 8);
  }, [animatedFieldStrength]);
  const fieldNumberColor = useMemo(() => rgbToCss(colorFromStops(animatedFieldStrength, FIELD_NUMBER_STOPS)), [animatedFieldStrength]);
  const pulseRingColor = useMemo(() => rgbToCss(colorFromStops(animatedFieldStrength, PULSE_RING_STOPS)), [animatedFieldStrength]);
  const uiSurfaceColor = useMemo(() => rgbToCss(colorFromStops(animatedFieldStrength, BACKGROUND_STOPS), 0.2), [animatedFieldStrength]);
  const uiBorderGlow = useMemo(() => rgbToCss(colorFromStops(animatedFieldStrength, PULSE_RING_STOPS), 0.48), [animatedFieldStrength]);
  const numberShake = useMemo(() => shakeStrength(animatedFieldStrength), [animatedFieldStrength]);
  const ringShake = useMemo(() => shakeStrength(animatedFieldStrength), [animatedFieldStrength]);
  const shootingStarActive = animatedFieldStrength >= 13500;
  const destabilizedState = animatedFieldStrength >= 150000;
  const rainbowUiState = animatedFieldStrength >= 200000;
  const rainbowTransitionProgress = useMemo(() => {
    if (animatedFieldStrength <= 15000) return 0;
    if (animatedFieldStrength >= 200000) return 1;
    return (animatedFieldStrength - 15000) / (200000 - 15000);
  }, [animatedFieldStrength]);
  const orbScale = useMemo(
    () => 1 + Math.min(animatedFieldStrength / 18000, 0.2) + Math.sin(refreshTick * 1.7) * (animatedFieldStrength >= 150000 ? 0.08 : 0.03),
    [animatedFieldStrength, refreshTick]
  );
  const backdropDriftSeconds = useMemo(() => Math.max(16 - Math.min(animatedFieldStrength / 1100, 11), 4), [animatedFieldStrength]);
  const isLoadingField = !hasInitialFix && !simulatedPosition && !spoofActive && !error;

  useEffect(() => {
    document.title = `${isLoadingField ? "..." : formatField(animatedFieldStrength)} CLT Magnetic Field`;
  }, [animatedFieldStrength, isLoadingField]);

  const submitTeleport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const lat = Number(latInput);
    const lon = Number(lonInput);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setError("Teleport requires valid latitude and longitude numbers.");
      return;
    }

    setPosition({ lat, lon });
    setSpoofActive(true);
    setError("");
  };

  const disableSpoof = () => {
    setLatInput("");
    setLonInput("");
    setSpoofActive(false);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setPosition(CHARLOTTE);
          setHasInitialFix(true);
          setError("Geolocation denied. Defaulting to Charlotte, NC.");
          return;
        }

        setError(geoError.message);
      }
    );
  };

  const submitSimulator = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!simulatorUnlocked) {
      setError("Unlock Location Simulator first.");
      return;
    }

    const lat = Number(simLatInput);
    const lon = Number(simLonInput);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setError("Simulator requires valid latitude and longitude numbers.");
      return;
    }

    setSimulatedPosition({ lat, lon });
    setError("");
  };

  const setSimulatorPoint = (coords: Coordinates) => {
    setSimLatInput(coords.lat.toString());
    setSimLonInput(coords.lon.toString());
    setSimulatedPosition(coords);
    setError("");
  };

  const unlockLocationSimulator = () => {
    if (simulatorPasswordInput === LOCATION_PASSWORD) {
      setSimulatorUnlocked(true);
      setSimulatorPasswordInput("");
      setError("");
      return;
    }
    setError("Incorrect Location Simulator password.");
  };

  const resetFieldUploaderForm = () => {
    setEditingFieldId(null);
    setFieldNameInput("");
    setFieldIntensityInput("5000");
    setFieldRangeInput("100");
    setFieldVisibility("private");
    setFieldStartTimeInput("");
    setFieldEndTimeInput("");
    setFieldLatInput("");
    setFieldLonInput("");
  };

  const submitFieldUploader = () => {

    const providedLat = fieldLatInput.trim() ? Number(fieldLatInput) : null;
    const providedLon = fieldLonInput.trim() ? Number(fieldLonInput) : null;

    if ((providedLat === null) !== (providedLon === null)) {
      setError("Enter both latitude and longitude, or leave both empty.");
      return;
    }

    const fallbackPosition = activePosition;
    if ((providedLat === null || providedLon === null) && !fallbackPosition) {
      setError("Need active location or explicit coordinates before uploading a field.");
      return;
    }

    if ((providedLat !== null && (Number.isNaN(providedLat) || providedLat < -90 || providedLat > 90)) ||
      (providedLon !== null && (Number.isNaN(providedLon) || providedLon < -180 || providedLon > 180))) {
      setError("Coordinates must be valid latitude/longitude values.");
      return;
    }

    const center = providedLat !== null && providedLon !== null
      ? { lat: providedLat, lon: providedLon }
      : (fallbackPosition as Coordinates);

    const maxIntensity = Number(fieldIntensityInput);
    const maxRangeMeters = Number(fieldRangeInput);

    if (!fieldNameInput.trim()) {
      setError("Field name is required.");
      return;
    }

    if (Number.isNaN(maxIntensity) || maxIntensity <= 0 || maxIntensity > MAX_UPLOADED_INTENSITY) {
      setError(`Field intensity must be between 1 and ${MAX_UPLOADED_INTENSITY}.`);
      return;
    }

    if (Number.isNaN(maxRangeMeters) || maxRangeMeters <= 0 || maxRangeMeters > MAX_UPLOADED_RANGE_METERS) {
      setError(`Maximum intensity range must be between 1 and ${MAX_UPLOADED_RANGE_METERS} meters.`);
      return;
    }

    if ((fieldStartTimeInput && !fieldEndTimeInput) || (!fieldStartTimeInput && fieldEndTimeInput)) {
      setError("Set both start and end time, or leave both empty.");
      return;
    }

    const payload: UploadedSecretField = {
      id: editingFieldId ?? `uploaded-${Date.now()}`,
      name: fieldNameInput.trim(),
      center,
      maxIntensity,
      maxRangeMeters,
      visibility: fieldVisibility,
      startTime: fieldStartTimeInput,
      endTime: fieldEndTimeInput
    };

    setUploadedFields((prev) => {
      if (!editingFieldId) return [payload, ...prev];
      return prev.map((item) => (item.id === editingFieldId ? payload : item));
    });

    setError("");
    resetFieldUploaderForm();
  };

  const editUploadedField = (field: UploadedSecretField) => {
    setEditingFieldId(field.id);
    setFieldNameInput(field.name);
    setFieldIntensityInput(field.maxIntensity.toString());
    setFieldRangeInput(field.maxRangeMeters.toString());
    setFieldVisibility(field.visibility);
    setFieldStartTimeInput(field.startTime);
    setFieldEndTimeInput(field.endTime);
    setFieldLatInput(field.center.lat.toString());
    setFieldLonInput(field.center.lon.toString());
  };

  const removeUploadedField = (fieldId: string) => {
    setUploadedFields((prev) => prev.filter((item) => item.id !== fieldId));
    if (editingFieldId === fieldId) resetFieldUploaderForm();
  };


  const effectiveSoundEnabled = soundEnabled;
  const beepsPerSecond = Math.min(Math.max(animatedFieldStrength * 0.01, 0), 40);
  const beepVolume = useMemo(() => {
    if (animatedFieldStrength < 100) return 0;
    if (animatedFieldStrength >= 500) return 1;
    return 0.1 + ((animatedFieldStrength - 100) / 400) * 0.9;
  }, [animatedFieldStrength]);

  useEffect(() => {
    beepsPerSecondRef.current = beepsPerSecond;
    beepVolumeRef.current = beepVolume;
  }, [beepVolume, beepsPerSecond]);

  useEffect(() => {
    if (!effectiveSoundEnabled || isLoadingField) {
      beepAccumulatorRef.current = 0;
      return;
    }

    const tickMs = 50;

    const ensureAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
      }
      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume();
      }
      return audioContextRef.current;
    };

    const playBeep = (ctx: AudioContext, peakGain: number) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 920;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.032);
    };

    const timer = window.setInterval(() => {
      const currentBeepsPerSecond = beepsPerSecondRef.current;
      const currentBeepVolume = beepVolumeRef.current;

      if (currentBeepsPerSecond <= 0 || currentBeepVolume <= 0) {
        beepAccumulatorRef.current = 0;
        return;
      }

      const ctx = ensureAudioContext();
      beepAccumulatorRef.current += currentBeepsPerSecond * (tickMs / 1000);

      let safety = 0;
      while (beepAccumulatorRef.current >= 1 && safety < 20) {
        playBeep(ctx, currentBeepVolume);
        beepAccumulatorRef.current -= 1;
        safety += 1;
      }
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [effectiveSoundEnabled, isLoadingField]);

  return (
    <main
      className={`page ${rainbowUiState ? "page-rainbow-mode" : ""}`}
      style={{
        background: dynamicBackground,
        ["--orb-accent" as string]: pulseRingColor,
        ["--orb-value" as string]: fieldNumberColor,
        ["--orb-surface" as string]: uiSurfaceColor,
        ["--orb-glow" as string]: uiBorderGlow,
        ["--drift-speed" as string]: `${backdropDriftSeconds}s`,
        ["--rainbow-transition" as string]: rainbowTransitionProgress.toString()
      }}
    >
      <div className="space-particles" aria-hidden>
        {BACKDROP_PARTICLES.map((particle, index) => (
          <span
            key={`${particle.symbol}-${index}`}
            className="space-particle"
            style={{ top: particle.top, left: particle.left, animationDelay: particle.delay }}
          >
            {particle.symbol}
          </span>
        ))}
      </div>
      <h1
        onClick={() => {
          const next = titleTapCount + 1;
          setTitleTapCount(next);
          if (next >= 5) {
            setTeleportVisible((prev) => !prev);
            setTitleTapCount(0);
          }
        }}
      >
        CLT Magnetic Field
      </h1>
      <p className="subtitle">Detect when you are near a Charlotte.</p>

      <section className={`field-core ${isLoadingField ? "is-loading" : ""}`}>
        <div className="field-particles" />
        <div
          className={`field-orb ${shootingStarActive ? "field-orb-stars" : ""} ${destabilizedState ? "field-orb-destabilized" : ""}`}
          style={{
            ["--ring-color" as string]: pulseRingColor,
            ["--ring-glow" as string]: rgbToCss(colorFromStops(animatedFieldStrength, PULSE_RING_STOPS), 0.85),
            ["--shake-distance" as string]: `${destabilizedState ? Math.max(ringShake, 2.6) : ringShake}px`,
            ["--pulse-speed" as string]: pulsesPerSecond > 0 ? `${Math.max(1 / pulsesPerSecond, 0.12)}s` : "1.2s",
            ["--meter-speed" as string]: `${Math.max(0.25, 0.8 - Math.min(animatedFieldStrength / 20000, 0.5))}s`,
            transform: `scale(${orbScale})`,
            animationPlayState: pulsesPerSecond > 0 || isLoadingField ? "running" : "paused",
            opacity: animatedFieldStrength <= 0 ? 0.8 : 1
          }}
        >
          <span className="field-ring field-ring-a" />
          <span className="field-ring field-ring-b" />
          <span className="field-ring field-ring-c" />
          <span className="field-core-dot" />
          <span className="field-scanline" />
        </div>
        <div className="field-meter" aria-hidden style={{ ["--meter-color" as string]: pulseRingColor }}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p
          className={`field-value ${destabilizedState ? "field-value-rainbow" : ""}`}
          style={{ color: fieldNumberColor, ["--shake-distance" as string]: `${destabilizedState ? Math.max(numberShake, 2.2) : numberShake}px` }}
        >
          {isLoadingField ? "..." : formatField(animatedFieldStrength)}
        </p>
        <p className="field-label">CLT Magnetic Field™</p>
        <p className="field-status">{isLoadingField ? "Calibrating magnetic sensors..." : statusMessage}</p>
      </section>

      <details className="target-list" open>
        <summary>
          Charlotte Selector: <span className="badge">{activeTarget.label}</span>
        </summary>
        <section className="target-selector">
            {COMPASS_TARGETS.map((target, index) => (
              <button
                key={target.label}
                type="button"
                className={index === activeTargetIndex ? "target-active" : ""}
                onClick={() => setActiveTargetIndex(index)}
              >
                {target.label}
              </button>
            ))}
          </section>
      </details>

      <button type="button" className="sim-toggle sound-toggle-button" onClick={() => setSoundEnabled((prev) => !prev)}>
        Sound: {soundEnabled ? "On" : "Off"}
      </button>

      {toTarget && (
        <section className="stats">
          <p>
            <strong>Tracked location:</strong> {activeTarget.label}
          </p>
          <p>
            <strong>Distance:</strong> <span className="stat-number">{toTarget.distance.toFixed(2)}</span> km
          </p>
          <p>
            <strong>Heading:</strong> <span className="stat-number">{toTarget.bearing.toFixed(2)}°</span>
          </p>
          {simulatedPosition && <p className="badge">Simulator active (using simulated location)</p>}
          {spoofActive && <p className="badge">Secret teleport spoof active</p>}
        </section>
      )}

      <button className="sim-toggle sim-toggle-bottom" type="button" onClick={() => setSimulatorOpen((prev) => !prev)}>
        {simulatorOpen ? "Hide" : "Open"} Location Simulator
      </button>

      {simulatorOpen && (
        <form onSubmit={submitSimulator} className="teleport">
          <h2>Location Simulator</h2>
                    {!simulatorUnlocked ? (
            <section className="password-lock">
              <label>
                Location Simulator password
                <input
                  type="password"
                  value={simulatorPasswordInput}
                  onChange={(event) => setSimulatorPasswordInput(event.target.value)}
                  placeholder="Enter password"
                />
              </label>
              <button type="button" onClick={unlockLocationSimulator}>
                Unlock Location Simulator
              </button>
            </section>
          ) : (
            <p className="badge">Location Simulator unlocked</p>
          )}
          {simulatorUnlocked && isMicroSecretToggleWindow(timeZoneByCoordinate[coordinateKey(EASTER_EGG)] ?? "America/Los_Angeles") && (
            <label className="offtime-toggle">
              <input
                type="checkbox"
                checked={microSecretOfftimeEnabled}
                onChange={(event) => setMicroSecretOfftimeEnabled(event.target.checked)}
              />
              Enable off-time micro secret field override (7:00pm-10:00am local Vancouver time)
            </label>
          )}
          {simulatorUnlocked && <div className="preset-row">
            <button type="button" onClick={() => setSimulatorPoint(CHARLOTTE)}>
              Use Charlotte, NC
            </button>
            <button type="button" onClick={() => setSimulatorPoint(CHARLOTTE_MI)}>
              Use Charlotte, MI Field
            </button>
            <button type="button" onClick={() => setSimulatorPoint(PACIFIC_FIELD)}>
              Use Haida Gwaii Islands
            </button>
            <button type="button" onClick={() => setSimulatorPoint(CARIBBEAN_FIELD)}>
              Use Charlotte Amalie, US Virgin Islands
            </button>
            <button type="button" onClick={() => setSimulatorPoint(PORT_CHARLOTTE_FL)}>
              Use Port Charlotte, FL
            </button>
            <button type="button" onClick={() => setSimulatorPoint(CHARLOTTETOWN_PEI)}>
              Use Charlottetown, PEI
            </button>
            <button type="button" onClick={() => setSimulatorPoint(CHARLOTTESVILLE_VA)}>
              Use Charlottesville, VA
            </button>
            <button type="button" onClick={() => setSimulatorPoint(QUEEN_CHARLOTTE_BURIAL_PLACE)}>
              Use Queen Charlotte Burial Place
            </button>
          </div>}
          {simulatorUnlocked && <label>
            Latitude
            <input value={simLatInput} onChange={(e) => setSimLatInput(e.target.value)} placeholder="35.22867647481079" />
          </label>}
          {simulatorUnlocked && <label>
            Longitude
            <input value={simLonInput} onChange={(e) => setSimLonInput(e.target.value)} placeholder="-80.84490976473366" />
          </label>}
          {simulatorUnlocked && (
            <>
              <button type="submit">Simulate Location</button>
              <button
                type="button"
                onClick={() => {
                  setSimLatInput("");
                  setSimLonInput("");
                  setSimulatedPosition(null);
                }}
              >
                Disable simulator
              </button>
            </>
          )}
        </form>
      )}


      <section className="teleport">
        <h3>Secret Field Uploader</h3>
        <p className="badge">Designated storage: shared browser local storage list</p>
        <div className="password-lock">
          <label>
            Field name
            <input value={fieldNameInput} onChange={(event) => setFieldNameInput(event.target.value)} placeholder="My secret field" />
          </label>
          <label>
            Field intensity max (x, max 50,000)
            <input value={fieldIntensityInput} onChange={(event) => setFieldIntensityInput(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            Maximum intensity range (y meters, max 100m)
            <input value={fieldRangeInput} onChange={(event) => setFieldRangeInput(event.target.value)} inputMode="decimal" />
          </label>
          <label>
            Visibility
            <select value={fieldVisibility} onChange={(event) => setFieldVisibility(event.target.value as "public" | "private")}>
              <option value="private">Visible to me only</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label>
            Latitude (optional, defaults to current location)
            <input value={fieldLatInput} onChange={(event) => setFieldLatInput(event.target.value)} placeholder="35.228676" />
          </label>
          <label>
            Longitude (optional, defaults to current location)
            <input value={fieldLonInput} onChange={(event) => setFieldLonInput(event.target.value)} placeholder="-80.844909" />
          </label>
          <label>
            Start time (field local time, optional)
            <input type="time" value={fieldStartTimeInput} onChange={(event) => setFieldStartTimeInput(event.target.value)} />
          </label>
          <label>
            End time (field local time, optional)
            <input type="time" value={fieldEndTimeInput} onChange={(event) => setFieldEndTimeInput(event.target.value)} />
          </label>
          <button type="button" onClick={submitFieldUploader}>{editingFieldId ? "Save field changes" : "Upload field"}</button>
          {editingFieldId && (
            <button type="button" onClick={resetFieldUploaderForm}>Cancel editing</button>
          )}
        </div>
      </section>

      {uploadedFields.length > 0 && (
        <section className="teleport">
          <h3>Created Secret Fields</h3>
          <div className="password-lock">
            {uploadedFields.map((field) => (
              <div key={field.id} className="stats">
                <p><strong>{field.name}</strong> <span className="badge">{field.visibility}</span></p>
                <p>Center: {field.center.lat.toFixed(6)}, {field.center.lon.toFixed(6)}</p>
                <p>x: {field.maxIntensity} | y: {field.maxRangeMeters}m</p>
                <p>Schedule: {field.startTime && field.endTime ? `${field.startTime}-${field.endTime} local time (±5m fades)` : "Always on"}</p>
                <div className="preset-row field-action-buttons">
                  <button type="button" onClick={() => editUploadedField(field)}>Edit</button>
                  <button type="button" onClick={() => removeUploadedField(field.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {teleportVisible && (
        <form onSubmit={submitTeleport} className="teleport teleport-secret">
          <h2>Secret Teleport (testing)</h2>
          <label>
            Latitude
            <input value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="35.22867647481079" />
          </label>
          <label>
            Longitude
            <input value={lonInput} onChange={(e) => setLonInput(e.target.value)} placeholder="-80.84490976473366" />
          </label>
          <button type="submit">Teleport</button>
          <button type="button" onClick={disableSpoof}>
            Disable spoof
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
