"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Coordinates = {
  lat: number;
  lon: number;
};

const CHARLOTTE: Coordinates = { lat: 35.2271, lon: -80.8431 };
const EASTER_EGG: Coordinates = { lat: 49.2729341959022, lon: -123.06941193669999 };

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

function cltMagneticField(distance: number) {
  if (distance <= 10) return 1000;
  if (distance <= 100) return lerp(1000, 200, (distance - 10) / 90);
  if (distance <= 200) return lerp(200, 50, (distance - 100) / 100);
  if (distance <= 400) return lerp(50, 10, (distance - 200) / 200);
  if (distance <= 1000) return lerp(10, 0, (distance - 400) / 600);
  return 0;
}

function easterEggField(distanceMeters: number) {
  if (distanceMeters <= 10) return 15000;
  if (distanceMeters <= 100) return lerp(15000, 500, (distanceMeters - 10) / 90);
  if (distanceMeters <= 1000) return lerp(500, 20, (distanceMeters - 100) / 900);
  if (distanceMeters <= 5000) return lerp(20, 0, (distanceMeters - 1000) / 4000);
  return 0;
}

function formatField(value: number) {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100) return value.toFixed(2);
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [position, setPosition] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [teleportVisible, setTeleportVisible] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [spoofActive, setSpoofActive] = useState(false);

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

    const onOrientation = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number") {
        setHeading((360 - webkitHeading) % 360);
        return;
      }

      if (event.alpha !== null) {
        setHeading((360 - event.alpha + 360) % 360);
      }
    };

    window.addEventListener("deviceorientation", onOrientation);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [spoofActive]);

  const toCharlotte = useMemo(() => {
    if (!position) return null;
    const distance = distanceKm(position, CHARLOTTE);
    const bearing = bearingDeg(position, CHARLOTTE);
    return { distance, bearing };
  }, [position]);

  const fieldStrength = useMemo(() => {
    if (!position) return 0;

    const eggDistanceMeters = distanceKm(position, EASTER_EGG) * 1000;
    const eggValue = easterEggField(eggDistanceMeters);
    if (eggValue > 0) return eggValue;

    return cltMagneticField(distanceKm(position, CHARLOTTE));
  }, [position]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !toCharlotte) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;

    const center = size / 2;
    const radius = 140;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "#4a5d85";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = "#dbeafe";
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText("N", center - 7, center - radius + 20);

    const targetAngle = toRad(toCharlotte.bearing - heading - 90);
    const tipX = center + Math.cos(targetAngle) * (radius - 10);
    const tipY = center + Math.sin(targetAngle) * (radius - 10);

    ctx.strokeStyle = "#fb7185";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#bfdbfe";
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillText("Charlotte, NC", center - 45, center + radius + 25);
  }, [heading, toCharlotte]);

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

  return (
    <main className="page">
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

      <canvas ref={canvasRef} className="compass" />

      {toCharlotte && (
        <section className="stats">
          <p>
            <strong>Bearing to Charlotte:</strong> {toCharlotte.bearing.toFixed(2)}°
          </p>
          <p>
            <strong>Distance:</strong> {toCharlotte.distance.toFixed(2)} km
          </p>
          <p>
            <strong>CLT Magnetic Field:</strong> {formatField(fieldStrength)}
          </p>
          {spoofActive && <p className="badge">Teleport spoof active</p>}
        </section>
      )}

      {teleportVisible && (
        <form onSubmit={submitTeleport} className="teleport">
          <h2>Secret Teleport (testing)</h2>
          <label>
            Latitude
            <input value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="35.2271" />
          </label>
          <label>
            Longitude
            <input value={lonInput} onChange={(e) => setLonInput(e.target.value)} placeholder="-80.8431" />
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
