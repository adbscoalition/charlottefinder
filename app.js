const $ = (id) => document.getElementById(id);
const fmt = (n, d = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: d })
    : "0";
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const cityFields = [
  {
    name: "Charlotte, NC",
    lat: 35.2271,
    lon: -80.8431,
    clt: 1000,
    mKm: 10,
    mhKm: 1000,
    type: "Type 2",
  },
  {
    name: "Charlotte, MI",
    lat: 42.5636,
    lon: -84.8358,
    clt: 575,
    mKm: 2,
    mhKm: 120,
    type: "Type 2",
  },
  {
    name: "Charlotte Amalie, USVI",
    lat: 18.3419,
    lon: -64.9307,
    clt: 300,
    mKm: 1,
    mhKm: 40,
    type: "Type 2",
  },
  {
    name: "Charlottetown, PEI",
    lat: 46.2382,
    lon: -63.1311,
    clt: 350,
    mKm: 2,
    mhKm: 24,
    type: "Type 2",
  },
  {
    name: "Port Charlotte, FL",
    lat: 26.9762,
    lon: -82.0906,
    clt: 400,
    mKm: 3,
    mhKm: 100,
    type: "Type 2",
  },
  {
    name: "Charlottesville, VA",
    lat: 38.0293,
    lon: -78.4767,
    clt: 450,
    mKm: 3,
    mhKm: 360,
    type: "Type 2",
  },
  {
    name: "Haida Gwaii",
    lat: 53.1019,
    lon: -132.0724,
    clt: 230,
    mKm: 200,
    mhKm: 450,
    type: "Type 2",
  },
];

const bands = [
  ["NS", 0.05, [0.3, 0.6]],
  ["CE", 0.2, [0.2, 0.4]],
  ["E", 0.5, [0.4, 0.7]],
  ["M", 1, [0.7, 1.2]],
  ["PS", 1.7, [0.4, 0.7]],
  ["MS", 3.5, [0.2, 0.4]],
  ["MP", 4.5, [0.1, 0.2]],
  ["MH", 6.5, [0.05, 0.1]],
];

function initShell() {
  setTimeout(() => $("entryLoader")?.classList.add("is-hidden"), 450);
  $("navToggle")?.addEventListener("click", () => {
    const nav = $("primaryNav");
    nav?.classList.toggle("is-open");
    $("navToggle").setAttribute(
      "aria-expanded",
      nav?.classList.contains("is-open") ? "true" : "false",
    );
  });
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function tungsten(clt) {
  return clt <= 0 ? 0 : 0.798 / (1 + (4555 / clt) ** 0.814);
}
function mBandMeters(clt) {
  return clt <= 0 ? 0 : 1.09 + 40.7 / (1 + (5142 / clt) ** 1.542);
}
function contribution(source, lat, lon) {
  const d = distanceKm(lat, lon, source.lat, source.lon);
  const max =
    source.radiusKm ?? source.mhKm ?? (mBandMeters(source.clt) * 6.5) / 1000;
  if (d > max) return { ...source, distance: d, contribution: 0, band: "out" };
  const falloff = Math.max(0, 1 - (d / max) ** 1.28);
  const contribution =
    source.type === "Type R"
      ? source.clt * falloff * 0.65
      : source.clt * falloff;
  const mKm =
    source.mKm ??
    (source.customMBand
      ? source.customMBand / 1000
      : mBandMeters(source.clt) / 1000);
  const band =
    source.type === "Type R"
      ? "R"
      : d <= mKm
        ? "M"
        : d <= max * 0.26
          ? "PS"
          : d <= max * 0.54
            ? "MS"
            : d <= max * 0.7
              ? "MP"
              : "MH";
  return { ...source, distance: d, contribution, band };
}

function rows(target, data, tungstenMode = false) {
  if (!target) return;
  target.innerHTML =
    data
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.type}</td><td>${item.band}</td><td>${fmt(item.distance, 2)} km</td><td>${fmt(tungstenMode ? tungsten(item.contribution) : item.contribution, 3)} ${tungstenMode ? "mg/m³" : "CLT"}</td></tr>`,
      )
      .join("") ||
    `<tr><td colspan="5">No active lore signals in detectable range.</td></tr>`;
}

function loadScenarios() {
  try {
    return JSON.parse(
      localStorage.getItem("charlotteDynamicsScenarios") || "[]",
    );
  } catch {
    return [];
  }
}
function saveScenarios(items) {
  localStorage.setItem("charlotteDynamicsScenarios", JSON.stringify(items));
}
function scenarioActive(item) {
  if (!item.day && !item.time) return true;
  const now = new Date();
  const dayOk =
    !item.day ||
    item.day === now.toLocaleDateString(undefined, { weekday: "long" });
  const hourOk =
    !item.time ||
    item.time.split(":")[0] === String(now.getHours()).padStart(2, "0");
  return dayOk && hourOk;
}
function renderScenarioList() {
  const list = $("uploadedFieldList");
  if (!list) return;
  const items = loadScenarios();
  list.innerHTML =
    items
      .map(
        (item, index) =>
          `<li><strong>${item.name}</strong><br>${item.type} · ${fmt(item.clt)} CLT · ${item.lat}, ${item.lon}<div class="actions"><button class="btn" data-edit="${index}">Edit</button><button class="btn" data-delete="${index}">Delete</button></div></li>`,
      )
      .join("") || "<li>No local custom fields saved yet.</li>";
  list.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = loadScenarios();
      next.splice(Number(btn.dataset.delete), 1);
      saveScenarios(next);
      renderScenarioList();
      runScan();
    }),
  );
  list
    .querySelectorAll("[data-edit]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        fillScenario(
          loadScenarios()[Number(btn.dataset.edit)],
          Number(btn.dataset.edit),
        ),
      ),
    );
}
function fillScenario(item, index) {
  $("fieldName").value = item.name;
  $("fieldClt").value = item.clt;
  $("fieldType").value = item.type;
  $("fieldLat").value = item.lat;
  $("fieldLon").value = item.lon;
  $("fieldCustomMBand").value = item.customMBand || "";
  $("fieldDetectionRange").value = item.radiusKm || "";
  $("fieldScheduleDay").value = item.day || "";
  $("fieldScheduleTime").value = item.time || "";
  $("fieldEditIndex").value = index;
  toggleFieldTypeControls();
}
function toggleFieldTypeControls() {
  const type = $("fieldType")?.value;
  $("type1sControl")?.toggleAttribute("hidden", type !== "Type 1S");
  $("typeRControl")?.toggleAttribute("hidden", type !== "Type R");
}

let currentPosition = {
  lat: 35.2271,
  lon: -80.8431,
  accuracy: null,
  source: "Charlotte, NC demo seed",
};
function logTelemetry(message) {
  const stream = $("telemetryStream");
  if (!stream) return;
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  stream.textContent = `${line}\n${stream.textContent}`.slice(0, 5000);
}
function runScan() {
  if (!$("cltSystemApp")) return;
  const custom = loadScenarios()
    .filter(scenarioActive)
    .map((item) => ({
      name: item.name,
      lat: Number(item.lat),
      lon: Number(item.lon),
      clt: Number(item.clt),
      type: item.type,
      customMBand: Number(item.customMBand) || null,
      radiusKm: item.type === "Type R" ? Number(item.radiusKm || 1) : null,
    }));
  const readings = [...cityFields, ...custom]
    .map((src) => contribution(src, currentPosition.lat, currentPosition.lon))
    .filter((item) => item.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  const total = readings.reduce((sum, item) => sum + item.contribution, 0);
  const nearestNamed = cityFields
    .map((src) => contribution(src, currentPosition.lat, currentPosition.lon))
    .sort((a, b) => a.distance - b.distance)[0];
  const nearestCustom = custom.length
    ? custom
        .map((src) =>
          contribution(src, currentPosition.lat, currentPosition.lon),
        )
        .sort((a, b) => a.distance - b.distance)[0]
    : null;
  $("cltTotalField").textContent = `${fmt(total, 2)} CLT`;
  $("cltTungsten").textContent = `${fmt(tungsten(total), 4)} mg/m³`;
  $("gpsAccuracy").textContent = currentPosition.accuracy
    ? `${fmt(currentPosition.accuracy, 0)} m`
    : "manual/simulated";
  $("positionStatus").textContent =
    `${currentPosition.source}: ${fmt(currentPosition.lat, 5)}, ${fmt(currentPosition.lon, 5)}`;
  $("nearestNamedPlace").textContent =
    `${nearestNamed.name} · ${fmt(nearestNamed.distance, 2)} km`;
  $("nearestLocalField").textContent = nearestCustom
    ? `${nearestCustom.name} · ${fmt(nearestCustom.distance, 2)} km · ${nearestCustom.band}`
    : "No local custom fields";
  rows($("cltContributionTable"), readings, false);
  rows($("tungstenContributionTable"), readings, true);
  $("cltContributors").innerHTML =
    readings
      .slice(0, 6)
      .map(
        (item) =>
          `<li>${item.name}: ${fmt(item.contribution, 2)} CLT (${item.band})</li>`,
      )
      .join("") || "<li>No active contributors.</li>";
  logTelemetry(
    `Scan ${fmt(total, 2)} CLT / W ${fmt(tungsten(total), 4)} at ${fmt(currentPosition.lat, 4)}, ${fmt(currentPosition.lon, 4)}`,
  );
}
function initDetector() {
  if (!$("cltSystemApp")) return;
  renderScenarioList();
  toggleFieldTypeControls();
  runScan();
  $("fieldType")?.addEventListener("change", toggleFieldTypeControls);
  $("manualScan")?.addEventListener("click", () => {
    currentPosition = {
      lat: Number($("manualLat").value),
      lon: Number($("manualLon").value),
      accuracy: null,
      source: "Manual coordinate scan",
    };
    runScan();
  });
  $("startGeo")?.addEventListener("click", () => {
    if (!navigator.geolocation)
      return logTelemetry("Geolocation not available in this browser.");
    navigator.geolocation.watchPosition(
      (pos) => {
        currentPosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "Live device tracking",
        };
        runScan();
      },
      (err) => logTelemetry(`Geolocation blocked: ${err.message}`),
      { enableHighAccuracy: true },
    );
    logTelemetry("Live detector watch requested.");
  });
  $("useDeviceForField")?.addEventListener("click", () => {
    $("fieldLat").value = currentPosition.lat.toFixed(6);
    $("fieldLon").value = currentPosition.lon.toFixed(6);
  });
  $("clearFieldCoords")?.addEventListener("click", () => {
    $("fieldLat").value = "";
    $("fieldLon").value = "";
  });
  $("fieldReset")?.addEventListener("click", () => {
    $("scenarioForm")?.reset();
    $("fieldEditIndex").value = "";
    toggleFieldTypeControls();
  });
  $("fieldSave")?.addEventListener("click", () => {
    const item = {
      name: $("fieldName").value || "Unnamed Charlotte scenario",
      clt: Number($("fieldClt").value),
      type: $("fieldType").value,
      lat: Number($("fieldLat").value),
      lon: Number($("fieldLon").value),
      customMBand: Number($("fieldCustomMBand").value) || null,
      radiusKm: Number($("fieldDetectionRange").value) || null,
      day: $("fieldScheduleDay").value,
      time: $("fieldScheduleTime").value,
    };
    if (
      !Number.isFinite(item.clt) ||
      !Number.isFinite(item.lat) ||
      !Number.isFinite(item.lon)
    )
      return logTelemetry(
        "Scenario save rejected: CLT and coordinates are required.",
      );
    const items = loadScenarios();
    const edit = $("fieldEditIndex").value;
    edit === "" ? items.push(item) : items.splice(Number(edit), 1, item);
    saveScenarios(items);
    renderScenarioList();
    $("scenarioForm")?.reset();
    $("fieldEditIndex").value = "";
    toggleFieldTypeControls();
    runScan();
  });
  $("pinScan")?.addEventListener("click", () => {
    const list = $("scanSheetList");
    list.innerHTML = `<li>${new Date().toLocaleString()} · ${$("cltTotalField").textContent} · ${$("cltTungsten").textContent}</li>${list.innerHTML}`;
  });
  $("copyTelemetry")?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("telemetryStream").textContent);
    logTelemetry("Telemetry copied to clipboard.");
  });
}

function bandRows(clt) {
  const m = mBandMeters(clt),
    w = tungsten(clt);
  return bands
    .map(
      ([name, mult, range]) =>
        `<tr><td>${name}</td><td>${fmt(m * mult, 2)} m</td><td>${fmt(w * range[0], 4)}–${fmt(w * range[1], 4)} mg/m³</td></tr>`,
    )
    .join("");
}
function initCalculator() {
  if (!$("fieldCalculatorApp")) return;
  $("fcCalculate")?.addEventListener("click", () => {
    const name = ($("fcName").value || "").trim().toLowerCase();
    const N = Number($("fcRank").value),
      m = Number($("fcAppearance").value),
      P = Number($("fcSurnameP1").value),
      Q = Number($("fcRegionalQ").value);
    if (name !== "charlotte") {
      $("fcResult").innerHTML =
        `<div class="metric"><strong>0 CLT</strong><p>Legal signal name is not Charlotte, so the fictional CLT-6 output is zero.</p></div>`;
      return;
    }
    if ([N, m, P, Q].some((v) => !Number.isFinite(v) || v <= 0)) {
      $("fcResult").innerHTML =
        `<p>Enter positive N, M, P, and Q values to generate the lore signal.</p>`;
      return;
    }
    const B = 110 / N,
      A = 0.75 + 0.05 * clamp(m, 0, 10),
      logP = Math.log10(P),
      logQ = Math.log10(Q);
    const L = Math.min(
      2.2,
      0.0092146 * logP ** 3 -
        0.0834066 * logP ** 2 +
        0.345823 * logP +
        0.466249,
    );
    const R =
      0.295453 +
      0.393664 * logQ -
      0.0618419 * logQ ** 2 +
      0.00509316 * logQ ** 3;
    const clt = Math.max(0, B * A * L * R);
    $("fcResult").innerHTML =
      `<div class="grid grid-3"><div class="metric"><span>CLT output</span><strong>${fmt(clt, 2)}</strong></div><div class="metric"><span>Tungsten cloud</span><strong>${fmt(tungsten(clt), 4)}</strong></div><div class="metric"><span>M-band</span><strong>${fmt(mBandMeters(clt), 2)} m</strong></div></div><h3>Band Specs</h3><table><thead><tr><th>Band</th><th>Radius</th><th>Tungsten min/max</th></tr></thead><tbody>${bandRows(clt)}</tbody></table><h3>Breakdown</h3><p>B=${fmt(B, 4)} · A=${fmt(A, 4)} · L=${fmt(L, 4)} · R=${fmt(R, 4)} · CLT=B×A×L×R</p>`;
  });
}

function initInstructions() {
  $("copyBtn")?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("instructionText").value);
    $("copyBtn").textContent = "Copied protocol";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initShell();
  initDetector();
  initCalculator();
  initInstructions();
});
