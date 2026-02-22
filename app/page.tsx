"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

const CHARLOTTE: Coordinates = { lat: 35.22867647481079, lon: -80.84490976473366 };
const EASTER_EGG: Coordinates = { lat: 49.2729341959022, lon: -123.06941193669999 };
const CHARLOTTE_MI: Coordinates = { lat: 42.56318196348821, lon: -84.83584647437215 };
const PACIFIC_FIELD: Coordinates = { lat: 53.255510249854304, lon: -132.08947116604432 };
const CARIBBEAN_FIELD: Coordinates = { lat: 18.34185490966226, lon: -64.9316281681369 };
const PORT_CHARLOTTE_FL: Coordinates = { lat: 27.010523765938274, lon: -82.14259591632731 };
const CHARLOTTETOWN_PEI: Coordinates = { lat: 46.23722371252871, lon: -63.12970137942366 };

const COMPASS_TARGETS: CompassTarget[] = [
  { label: "Charlotte, NC", center: CHARLOTTE },
  { label: "Charlotte, MI", center: CHARLOTTE_MI },
  { label: "Haida Gwaii Islands", center: PACIFIC_FIELD },
  { label: "Charlotte Amalie, US Virgin Islands", center: CARIBBEAN_FIELD },
  { label: "Port Charlotte, FL", center: PORT_CHARLOTTE_FL },
  { label: "Charlottetown, PEI", center: CHARLOTTETOWN_PEI }
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
  }
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
  if (value <= 0) return "";
  if (value < 10) return "A magnetic field?";
  if (value < 50) return "This shouldn't be here...";
  if (value < 300) return "Why is it spiking??!?!";
  if (value < 4000) return "ITS SPIKING AHH CHARLOTTE";
  if (value < 14000) return "THE HOLY CHARLOTTE!!!!";
  return "CHARLOTTE CHARLOTTE CHARLOTTE";
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

  const activePosition = simulatedPosition ?? position;

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
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
        setError(err.message);
      },
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [spoofActive]);

  const activeTarget = COMPASS_TARGETS[activeTargetIndex] ?? COMPASS_TARGETS[0];

  const toTarget = useMemo(() => {
    if (!activePosition) return null;
    const distance = distanceKm(activePosition, activeTarget.center);
    const bearing = bearingDeg(activePosition, activeTarget.center);
    return { distance, bearing };
  }, [activePosition, activeTarget]);

  const magneticBreakdown = useMemo(() => {
    if (!activePosition) return [] as Array<{ name: string; value: number; distance: number; category: MagneticSource["category"] }>;

    return MAGNETIC_SOURCES.map((source) => {
      const dist = distanceKm(activePosition, source.center);
      return { name: source.name, value: magneticValueFromBands(dist, source.bands), distance: dist, category: source.category };
    }).sort((a, b) => b.value - a.value);
  }, [activePosition]);

  const fieldStrength = useMemo(() => magneticBreakdown.reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const regularFieldStrength = useMemo(() => magneticBreakdown.filter((item) => item.category === "regular").reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const secretFieldStrength = useMemo(() => magneticBreakdown.filter((item) => item.category === "secret").reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const statusMessage = useMemo(() => (secretFieldStrength > 0 ? secretFieldMessage(secretFieldStrength) : regularFieldMessage(regularFieldStrength)), [regularFieldStrength, secretFieldStrength]);
  const dynamicBackground = useMemo(() => backgroundFromField(fieldStrength), [fieldStrength]);
  const pulsesPerSecond = useMemo(() => {
    if (fieldStrength <= 0) return 0;
    return Math.min(0.8 + fieldStrength / 1100, 8);
  }, [fieldStrength]);
  const fieldNumberColor = useMemo(() => rgbToCss(colorFromStops(fieldStrength, FIELD_NUMBER_STOPS)), [fieldStrength]);
  const pulseRingColor = useMemo(() => rgbToCss(colorFromStops(fieldStrength, PULSE_RING_STOPS)), [fieldStrength]);
  const uiSurfaceColor = useMemo(() => rgbToCss(colorFromStops(fieldStrength, BACKGROUND_STOPS), 0.2), [fieldStrength]);
  const uiBorderGlow = useMemo(() => rgbToCss(colorFromStops(fieldStrength, PULSE_RING_STOPS), 0.48), [fieldStrength]);
  const numberShake = useMemo(() => shakeStrength(fieldStrength), [fieldStrength]);
  const ringShake = useMemo(() => shakeStrength(fieldStrength), [fieldStrength]);
  const isLoadingField = !hasInitialFix && !simulatedPosition && !spoofActive && !error;

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
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    });
  };

  const submitSimulator = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

  return (
    <main
      className="page"
      style={{
        background: dynamicBackground,
        ["--orb-accent" as string]: pulseRingColor,
        ["--orb-value" as string]: fieldNumberColor,
        ["--orb-surface" as string]: uiSurfaceColor,
        ["--orb-glow" as string]: uiBorderGlow
      }}
    >
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
          className="field-orb"
          style={{
            ["--ring-color" as string]: pulseRingColor,
            ["--ring-glow" as string]: rgbToCss(colorFromStops(fieldStrength, PULSE_RING_STOPS), 0.85),
            ["--shake-distance" as string]: `${ringShake}px`,
            ["--pulse-speed" as string]: pulsesPerSecond > 0 ? `${Math.max(1 / pulsesPerSecond, 0.12)}s` : "1.2s",
            animationPlayState: pulsesPerSecond > 0 || isLoadingField ? "running" : "paused",
            opacity: fieldStrength <= 0 ? 0.8 : 1
          }}
        >
          <span className="field-ring field-ring-a" />
          <span className="field-ring field-ring-b" />
          <span className="field-ring field-ring-c" />
          <span className="field-core-dot" />
          <span className="field-scanline" />
        </div>
        <div className="field-meter" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="field-value" style={{ color: fieldNumberColor, ["--shake-distance" as string]: `${numberShake}px` }}>
          {isLoadingField ? "..." : formatField(fieldStrength)}
        </p>
        <p className="field-label">CLT Magnetic Field™</p>
        <p className="field-status">{isLoadingField ? "Calibrating magnetic sensors..." : statusMessage}</p>
      </section>

      <details className="target-list" open>
        <summary>
          Selected location: <span className="badge">{activeTarget.label}</span>
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
          <div className="preset-row">
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
          </div>
          <label>
            Latitude
            <input value={simLatInput} onChange={(e) => setSimLatInput(e.target.value)} placeholder="35.22867647481079" />
          </label>
          <label>
            Longitude
            <input value={simLonInput} onChange={(e) => setSimLonInput(e.target.value)} placeholder="-80.84490976473366" />
          </label>
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
        </form>
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
