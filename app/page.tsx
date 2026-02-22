"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Coordinates = {
  lat: number;
  lon: number;
};

type MagneticSource = {
  name: string;
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
const EASTER_EGG: Coordinates = { lat: 49.2729341959022, lon: -123.06941193669999 }; // Secret Vancouver anomaly
const CHARLOTTE_MI: Coordinates = { lat: 42.56318196348821, lon: -84.83584647437215 };
const PACIFIC_FIELD: Coordinates = { lat: 53.255510249854304, lon: -132.08947116604432 };
const CARIBBEAN_FIELD: Coordinates = { lat: 18.34185490966226, lon: -64.9316281681369 };

const COMPASS_TARGETS: CompassTarget[] = [
  { label: "Charlotte, NC", center: CHARLOTTE },
  { label: "Charlotte, MI", center: CHARLOTTE_MI },
  { label: "Haida Gwaii Islands", center: PACIFIC_FIELD },
  { label: "Charlotte Amalie, US Virgin Islands", center: CARIBBEAN_FIELD }
];

const MAGNETIC_SOURCES: MagneticSource[] = [
  {
    name: "Charlotte, NC",
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
    center: PACIFIC_FIELD,
    bands: [
      { startKm: 0, endKm: 200, startValue: 230, endValue: 230 },
      { startKm: 200, endKm: 350, startValue: 230, endValue: 20 },
      { startKm: 350, endKm: 450, startValue: 20, endValue: 0 }
    ]
  },
  {
    name: "Caribbean Field",
    center: CARIBBEAN_FIELD,
    bands: [
      { startKm: 0, endKm: 1, startValue: 300, endValue: 300 },
      { startKm: 1, endKm: 10, startValue: 300, endValue: 100 },
      { startKm: 10, endKm: 25, startValue: 100, endValue: 20 },
      { startKm: 25, endKm: 40, startValue: 20, endValue: 0 }
    ]
  }
];

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

function normalizeHeading(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function getScreenAngle() {
  const orientationApi = window.screen.orientation;
  if (typeof orientationApi?.angle === "number") return orientationApi.angle;

  const legacyOrientation = (window as Window & { orientation?: number }).orientation;
  return typeof legacyOrientation === "number" ? legacyOrientation : 0;
}

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
  { value: 0, color: "#000000" },
  { value: 30, color: "#3f0000" },
  { value: 140, color: "#b91c1c" },
  { value: 300, color: "#f97316" },
  { value: 1000, color: "#facc15" },
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

function fieldMessage(value: number) {
  if (value <= 0) return "You're not near any Charlotte.";
  if (value < 100) return "You feel a slight force of Charlotte...";
  if (value < 199) return "The force is getting stronger...";
  if (value < 500) return "You enter the sphere of influence.";
  if (value < 1000) return "CHARLOTTE!!!! YAY!!!!!";
  if (value < 3000) return "Why is there a stronger Charlotte nearby...?";
  if (value < 14000) return "The Force is IMMENSE...!";
  return "YOU FEEL A STRONG CHARLOTTE LOCATION!!!!!!!!!";
}

function backgroundFromField(value: number) {
  const clampedValue = Math.max(value, 0);

  if (clampedValue <= BACKGROUND_STOPS[0].value) {
    const base = hexToRgb(BACKGROUND_STOPS[0].color);
    return `radial-gradient(circle at 20% 20%, ${rgbToCss(base, 0.5)} 0%, ${rgbToCss(base)} 75%)`;
  }

  const upperStop = BACKGROUND_STOPS.find((stop) => clampedValue <= stop.value) ?? BACKGROUND_STOPS[BACKGROUND_STOPS.length - 1];
  const upperIndex = BACKGROUND_STOPS.indexOf(upperStop);
  const lowerStop = BACKGROUND_STOPS[Math.max(upperIndex - 1, 0)];
  const span = Math.max(upperStop.value - lowerStop.value, 1);
  const t = Math.min(Math.max((clampedValue - lowerStop.value) / span, 0), 1);

  const mixed = mixRgb(hexToRgb(lowerStop.color), hexToRgb(upperStop.color), t);
  const glow = mixRgb(mixed, { r: 255, g: 255, b: 255 }, 0.2);
  return `radial-gradient(circle at 20% 20%, ${rgbToCss(glow, 0.55)} 0%, ${rgbToCss(mixed, 0.95)} 70%)`;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [position, setPosition] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [headingAccuracy, setHeadingAccuracy] = useState<"true-north" | "approximate" | "magnetometer" | "unknown">("unknown");
  const [orientationPermissionRequired, setOrientationPermissionRequired] = useState(false);
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const [error, setError] = useState<string>("");

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
  const [headingOffset, setHeadingOffset] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [magnetometerAvailable, setMagnetometerAvailable] = useState(false);
  const [magnetometerEnabled, setMagnetometerEnabled] = useState(false);

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
        setError("");
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true }
    );

    const permissionApi = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof permissionApi.requestPermission === "function") {
      setOrientationPermissionRequired(true);
      setOrientationEnabled(false);
    } else {
      setOrientationEnabled(true);
    }

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [spoofActive]);

  useEffect(() => {
    if (!orientationEnabled) return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (magnetometerEnabled) return;
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number" && Number.isFinite(webkitHeading)) {
        setHeading(normalizeHeading(webkitHeading));
        setHeadingAccuracy("true-north");
        return;
      }

      if (event.alpha === null) return;

      const alpha = normalizeHeading(event.alpha);
      const screenAngle = getScreenAngle();
      const computedHeading = normalizeHeading(360 - alpha + screenAngle);
      setHeading(computedHeading);
      setHeadingAccuracy(event.absolute ? "approximate" : "unknown");
    };

    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, onOrientation as EventListener);

    return () => {
      window.removeEventListener(eventName, onOrientation as EventListener);
    };
  }, [magnetometerEnabled, orientationEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isSamsung = userAgent.includes("samsung") || userAgent.includes("sm-");
    const MagnetometerCtor = (window as Window & { Magnetometer?: new (options?: { frequency?: number }) => {
      x: number | null;
      y: number | null;
      addEventListener: (type: "reading" | "error", listener: EventListener) => void;
      removeEventListener: (type: "reading" | "error", listener: EventListener) => void;
      start: () => void;
      stop: () => void;
    } }).Magnetometer;

    if (!isSamsung || !MagnetometerCtor) {
      setMagnetometerAvailable(false);
      return;
    }

    setMagnetometerAvailable(true);
    let sensor: ReturnType<typeof MagnetometerCtor> | null = null;

    const startSensor = async () => {
      try {
        const permissionsApi = navigator.permissions as Permissions | undefined;
        if (permissionsApi?.query) {
          const status = await permissionsApi.query({ name: "magnetometer" as PermissionName });
          if (status.state === "denied") return;
        }
      } catch {
        // Ignore permissions API issues and try sensor start directly.
      }

      try {
        sensor = new MagnetometerCtor({ frequency: 20 });
      } catch {
        return;
      }

      const onReading = () => {
        if (!sensor || sensor.x === null || sensor.y === null) return;

        const rawHeading = toDeg(Math.atan2(sensor.y, sensor.x));
        const screenAngle = getScreenAngle();
        const headingFromMag = normalizeHeading(rawHeading + 90 + screenAngle);
        setHeading(headingFromMag);
        setHeadingAccuracy("magnetometer");
        setMagnetometerEnabled(true);
      };

      const onError = () => {
        setMagnetometerEnabled(false);
      };

      sensor.addEventListener("reading", onReading as EventListener);
      sensor.addEventListener("error", onError as EventListener);
      sensor.start();
    };

    startSensor();

    return () => {
      if (sensor) {
        sensor.stop();
      }
      setMagnetometerEnabled(false);
    };
  }, []);

  const enableOrientation = async () => {
    const permissionApi = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof permissionApi.requestPermission !== "function") {
      setOrientationEnabled(true);
      return;
    }

    try {
      const permission = await permissionApi.requestPermission();
      if (permission === "granted") {
        setOrientationEnabled(true);
        setOrientationPermissionRequired(false);
      } else {
        setError("Compass permission denied. Enable motion access in Safari settings.");
      }
    } catch {
      setError("Could not request compass permission on this device.");
    }
  };


  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Back camera is not available in this browser.");
      return;
    }

    let mounted = true;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const preferred = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        stream = preferred;
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          if (mounted) {
            setCameraError("Unable to access camera. Allow camera permission to use AR arrow mode.");
            setCameraActive(false);
          }
          return;
        }
      }

      if (!mounted || !stream) return;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setCameraError("");
      setCameraActive(true);
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
    };
  }, []);

  const activeTarget = COMPASS_TARGETS[activeTargetIndex] ?? COMPASS_TARGETS[0];

  const toTarget = useMemo(() => {
    if (!activePosition) return null;
    const distance = distanceKm(activePosition, activeTarget.center);
    const bearing = bearingDeg(activePosition, activeTarget.center);
    return { distance, bearing };
  }, [activePosition, activeTarget]);

  const magneticBreakdown = useMemo(() => {
    if (!activePosition) return [] as Array<{ name: string; value: number }>;

    return MAGNETIC_SOURCES.map((source) => {
      const dist = distanceKm(activePosition, source.center);
      return { name: source.name, value: magneticValueFromBands(dist, source.bands) };
    });
  }, [activePosition]);

  const fieldStrength = useMemo(() => magneticBreakdown.reduce((sum, item) => sum + item.value, 0), [magneticBreakdown]);
  const statusMessage = useMemo(() => fieldMessage(fieldStrength), [fieldStrength]);
  const dynamicBackground = useMemo(() => backgroundFromField(fieldStrength), [fieldStrength]);
  const calibratedHeading = useMemo(() => normalizeHeading(heading + headingOffset), [heading, headingOffset]);
  const relativeBearing = useMemo(() => {
    if (!toTarget) return 0;
    return normalizeHeading(toTarget.bearing - calibratedHeading);
  }, [calibratedHeading, toTarget]);
  const pulsesPerSecond = useMemo(() => Math.min(fieldStrength / 1000, 8), [fieldStrength]);


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
    <main className="page" style={{ background: dynamicBackground }}>
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
        Charlotte Finder Compass
      </h1>
      <p className="subtitle">Qibla-style direction finder for Charlotte, North Carolina.</p>

      <button className="sim-toggle" type="button" onClick={() => setSimulatorOpen((prev) => !prev)}>
        {simulatorOpen ? "Hide" : "Open"} Location Simulator
      </button>

      {orientationPermissionRequired && !orientationEnabled && (
        <button className="sim-toggle" type="button" onClick={enableOrientation}>
          Enable iOS Compass Access
        </button>
      )}

      {!orientationEnabled && !orientationPermissionRequired && <p className="subtitle">Compass sensor unavailable.</p>}

      <section className="camera-shell">
        <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
        <div className="camera-overlay">
          <div
            className="ar-horizon-line"
            style={{
              transform: `translate(-50%, -50%) rotate(${relativeBearing}deg)`,
              animationDuration: pulsesPerSecond > 0 ? `${Math.max(1 / pulsesPerSecond, 0.12)}s` : undefined
            }}
          />
          <p className="ar-label">Rotate until the horizon line points toward Charlotte</p>
        </div>
      </section>

      {cameraError && <p className="error">{cameraError}</p>}
      {!cameraActive && !cameraError && <p className="subtitle">Starting back camera...</p>}


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

      {toTarget && (
        <section className="target-selector">
          <button
            type="button"
            onClick={() => {
              setHeadingOffset(normalizeHeading(toTarget.bearing - heading));
            }}
          >
            Calibrate to current target direction
          </button>
          <button type="button" onClick={() => setHeadingOffset(0)}>
            Reset calibration
          </button>
        </section>
      )}

      {toTarget && (
        <section className="stats">
          <p>
            <strong>Compass target:</strong> {activeTarget.label}
          </p>
          <p>
            <strong>Active point:</strong> {activePosition?.lat.toFixed(12)}, {activePosition?.lon.toFixed(12)}
          </p>
          <p>
            <strong>Bearing:</strong> {toTarget.bearing.toFixed(2)}°
          </p>
          <p>
            <strong>Heading quality:</strong> {headingAccuracy} ({calibratedHeading.toFixed(1)}°)
          </p>
          <p>
            <strong>Samsung magnetometer:</strong> {magnetometerAvailable ? (magnetometerEnabled ? "active" : "available") : "not available"}
          </p>
          <p>
            <strong>Distance:</strong> {toTarget.distance.toFixed(2)} km
          </p>
          <p>
            <strong>CLT Magnetic FIeld™:</strong> {formatField(fieldStrength)}
          </p>
          <p>
            <strong>Status:</strong> {statusMessage}
          </p>
          {simulatedPosition && <p className="badge">Simulator active (using simulated location)</p>}
          {spoofActive && <p className="badge">Secret teleport spoof active</p>}
        </section>
      )}

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
