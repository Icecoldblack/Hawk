import { store } from "./store";
import { SERVICE_FOR, type Dispatch, type Incident, type ServiceType, type Station } from "./types";

/**
 * Simulated emergency dispatch. Finds the nearest real station of the right
 * kind from Google Places and records it on the incident. It never calls,
 * messages or otherwise contacts the station.
 */

const CACHE_MS = 60 * 60 * 1000;
const SERVICES = ["ambulance", "police", "fire"] as const;

type Nearest = Record<ServiceType, Station | null>;

// Results and in-flight lookups, keyed by a ~100m grid so GPS jitter reuses them.
// Pinned to globalThis: in dev each route bundles its own copy of this module.
const g = globalThis as typeof globalThis & {
  __hawksightDispatch?: { cache: Map<string, { ts: number; nearest: Nearest }>; inFlight: Map<string, Promise<Nearest>> };
};
const { cache, inFlight } = (g.__hawksightDispatch ??= { cache: new Map(), inFlight: new Map() });

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLon = r(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Rough response time: road distance ~1.35x straight line, ~45 km/h average, plus 2 min to roll out. */
function estimateEta(distanceKm: number) {
  return Math.max(3, Math.round(2 + ((distanceKm * 1.35) / 45) * 60));
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_TYPES: Record<ServiceType, string[]> = {
  ambulance: ["hospital"],
  police: ["police"],
  fire: ["fire_station"],
};

type GooglePlace = {
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
};

/** Nearest place of one service type via Google Places (New), ranked by distance. */
async function googleNearest(lat: number, lon: number, service: ServiceType): Promise<Station | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY!,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.location,places.googleMapsUri",
    },
    body: JSON.stringify({
      includedTypes: GOOGLE_TYPES[service],
      maxResultCount: 1,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lon }, radius: 50_000 } },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const place = ((await res.json()) as { places?: GooglePlace[] }).places?.[0];
  if (!place?.location || !place.displayName) return null;
  const { latitude, longitude } = place.location;
  const distanceKm = haversineKm(lat, lon, latitude, longitude);
  return {
    name: place.displayName.text,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    lat: latitude,
    lon: longitude,
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMin: estimateEta(distanceKm),
    mapUrl: place.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  };
}

async function lookupGoogle(lat: number, lon: number): Promise<Nearest> {
  const found = await Promise.all(SERVICES.map((s) => googleNearest(lat, lon, s)));
  return { ambulance: found[0], police: found[1], fire: found[2] };
}

async function lookup(lat: number, lon: number): Promise<Nearest> {
  if (!GOOGLE_KEY) throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
  return lookupGoogle(lat, lon);
}

/** Nearest station of every type. Cached for an hour; concurrent callers share one request. */
export async function findNearestStations(lat: number, lon: number): Promise<Nearest> {
  const key = `${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.nearest;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = lookup(lat, lon)
      .then((nearest) => {
        cache.set(key, { ts: Date.now(), nearest });
        return nearest;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

/** Peek at the cache without starting a lookup. */
export function cachedStations(lat: number, lon: number): Nearest | null {
  return cache.get(`${lat.toFixed(3)}:${lon.toFixed(3)}`)?.nearest ?? null;
}

/** Look up stations ahead of time so a real incident dispatches instantly. */
export function warmDispatchCache(lat: number, lon: number) {
  findNearestStations(lat, lon).catch((err) => console.error("Dispatch prefetch failed:", err instanceof Error ? err.message : err));
}

/**
 * Attach a simulated dispatch to the incident. Waits at most `waitMs` so the
 * real alert is never held up; a slower lookup fills `incident.dispatch` in
 * later and the dashboard picks it up on its next poll.
 */
export async function simulateDispatch(incident: Incident, waitMs = 3000): Promise<Dispatch> {
  const service = SERVICE_FOR[incident.eventType];
  const base = { simulated: true as const, service, ts: Date.now(), station: null };
  const loc = store.location;
  if (!loc) return { ...base, status: "no_location" };

  const result: Promise<Dispatch> = findNearestStations(loc.lat, loc.lon).then(
    (nearest): Dispatch => {
      const station = nearest[service];
      return station ? { ...base, ts: Date.now(), status: "notified", station } : { ...base, status: "not_found" };
    },
    (err): Dispatch => {
      console.error("Simulated dispatch lookup failed:", err instanceof Error ? err.message : err);
      return { ...base, status: "error" };
    },
  );
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs));
  const quick = await Promise.race([result, timeout]);
  if (quick) return quick;

  void result.then((d) => {
    incident.dispatch = d;
  });
  return { ...base, status: "searching" };
}
