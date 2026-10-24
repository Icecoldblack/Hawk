const GDOT_BASE = "https://511ga.org/api/v2/get";

export const GDOT_RESOURCES = [
  "cameras",
  "messagesigns",
  "event",
  "alerts",
  "restareas",
  "portofentry",
  "expresslanes",
  "electricvehiclecharger",
] as const;

export type GdotResource = (typeof GDOT_RESOURCES)[number];

export type GdotCameraView = {
  Id: number;
  Url: string;
  Status: string;
  Description: string;
  SortId: number;
};

export type GdotCamera = {
  Id: number;
  Source: string;
  SourceId: string;
  Roadway: string;
  Direction: string;
  Latitude: number;
  Longitude: number;
  Location: string;
  SortOrder: number;
  Views: GdotCameraView[];
  Name: string;
};

export type GdotEvent = {
  ID: number;
  SourceId: string;
  Organization: string;
  RoadwayName: string;
  DirectionOfTravel: string;
  Description: string;
  Reported: number;
  LastUpdated: number;
  StartDate: number;
  PlannedEndDate: number;
  LanesAffected: string;
  LaneStatus: string;
  Latitude: number;
  Longitude: number;
  Priority: number;
  EventType: string;
  EventSubType: string;
  IsFullClosure: boolean;
  Region: string;
  Counties: string[];
  [k: string]: unknown;
};

export type GdotCameraOption = {
  viewId: number;
  name: string;
  roadway: string;
  direction: string;
  location: string;
  /** Nearest GA metro (from lat/lon) — GDOT locations use county names, not cities. */
  area: string;
  lat: number;
  lon: number;
};

// Rough metro bounding boxes so users can search "atlanta", "savannah" etc.
// GDOT location strings carry county names (Fulton, DeKalb), never city names.
const AREAS: { name: string; minLat: number; maxLat: number; minLon: number; maxLon: number }[] = [
  { name: "Atlanta", minLat: 33.45, maxLat: 34.2, minLon: -84.95, maxLon: -84.0 },
  { name: "Savannah", minLat: 31.85, maxLat: 32.3, minLon: -81.45, maxLon: -80.8 },
  { name: "Macon", minLat: 32.65, maxLat: 33.0, minLon: -83.9, maxLon: -83.45 },
  { name: "Augusta", minLat: 33.3, maxLat: 33.6, minLon: -82.2, maxLon: -81.75 },
  { name: "Columbus", minLat: 32.4, maxLat: 32.65, minLon: -85.1, maxLon: -84.75 },
  { name: "Athens", minLat: 33.85, maxLat: 34.1, minLon: -83.55, maxLon: -83.25 },
  { name: "Albany", minLat: 31.45, maxLat: 31.75, minLon: -84.35, maxLon: -83.95 },
  { name: "Rome", minLat: 34.15, maxLat: 34.45, minLon: -85.35, maxLon: -85.0 },
  { name: "Valdosta", minLat: 30.7, maxLat: 31.0, minLon: -83.45, maxLon: -83.1 },
  { name: "Gainesville", minLat: 34.2, maxLat: 34.45, minLon: -83.95, maxLon: -83.7 },
  { name: "Dalton", minLat: 34.7, maxLat: 34.9, minLon: -85.05, maxLon: -84.8 },
  { name: "Brunswick", minLat: 31.05, maxLat: 31.3, minLon: -81.6, maxLon: -81.35 },
];

function areaFor(lat: number, lon: number): string {
  const hit = AREAS.find((a) => lat >= a.minLat && lat <= a.maxLat && lon >= a.minLon && lon <= a.maxLon);
  return hit?.name ?? "";
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The cameras list is ~2.3MB upstream but changes rarely — cache it in-process
// so the picker doesn't hammer the throttled API (10 calls/60s).
let cameraCache: { ts: number; data: GdotCamera[] } | null = null;
const CAMERA_CACHE_MS = 5 * 60 * 1000;

export async function fetchGdotCameras(): Promise<GdotCamera[]> {
  if (cameraCache && Date.now() - cameraCache.ts < CAMERA_CACHE_MS) return cameraCache.data;
  const data = (await fetchGdot("cameras")) as GdotCamera[];
  cameraCache = { ts: Date.now(), data };
  return data;
}

export function toCameraOption(c: GdotCamera): GdotCameraOption | null {
  const view = c.Views.find((v) => v.Status === "Enabled") ?? c.Views[0];
  if (!view || !c.Latitude || !c.Longitude) return null;
  return {
    viewId: view.Id,
    name: c.Name || c.Location.split(":")[0] || `cam-${c.Id}`,
    roadway: c.Roadway,
    direction: c.Direction,
    location: c.Location || view.Description || c.Roadway,
    area: areaFor(c.Latitude, c.Longitude),
    lat: c.Latitude,
    lon: c.Longitude,
  };
}

export class GdotError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Resolves a camera view id to a live HLS (.m3u8) URL.
 * This endpoint is NOT part of /api/v2 — it's the same one 511ga.org's site
 * uses, needs no key, and returns a JSON string with a ~2min JWT token.
 */
export async function fetchGdotVideoUrl(viewId: number): Promise<string> {
  const res = await fetch(`https://511ga.org/Camera/GetVideoUrl?imageId=${viewId}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new GdotError(`GetVideoUrl returned ${res.status}`, res.status);
  const url = await res.json();
  if (typeof url !== "string" || !url.includes("m3u8")) {
    throw new GdotError("No video stream for this camera", 404);
  }
  return url;
}

export async function fetchGdot(resource: GdotResource): Promise<unknown> {
  const key = process.env.GDOT_511_API_KEY;
  if (!key) throw new GdotError("GDOT_511_API_KEY is not set in .env.local", 500);
  if (!GDOT_RESOURCES.includes(resource)) throw new GdotError(`Unknown resource: ${resource}`, 400);

  const res = await fetch(`${GDOT_BASE}/${resource}?key=${key}&format=json`, {
    // Throttle limit is 10 calls/60s; revalidate at most every 30s per resource.
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GdotError(`GDOT ${resource} returned ${res.status}: ${body.slice(0, 200)}`, res.status);
  }
  return res.json();
}
