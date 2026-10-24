import { store } from "./store";
import { SERVICE_FOR, type Dispatch, type Incident, type ServiceType, type Station } from "./types";

/**
 * Simulated emergency dispatch. Finds the nearest real station of the right
 * kind from OpenStreetMap and records it on the incident. It never calls,
 * messages or otherwise contacts the station.
 */

const OVERPASS_URLS = (process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const USER_AGENT = "Hawk-demo/0.1 (hackathon MVP; simulated dispatch only)";
const CACHE_MS = 60 * 60 * 1000;
const SERVICES = ["ambulance", "police", "fire"] as const;

// OSM tags for each service. Hospitals only count when they have an emergency department.
const FILTERS: Record<ServiceType, string[]> = {
  ambulance: ['nwr["emergency"="ambulance_station"]', 'nwr["amenity"="hospital"]["emergency"!="no"]'],
  police: ['nwr["amenity"="police"]'],
  fire: ['nwr["amenity"="fire_station"]'],
};

function classify(tags: Record<string, string>): ServiceType | null {
  if (tags.amenity === "fire_station") return "fire";
  if (tags.amenity === "police") return "police";
  if (tags.emergency === "ambulance_station" || tags.amenity === "hospital") return "ambulance";
  return null;
}

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

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

function formatAddress(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [street, tags["addr:city"]].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** One Overpass request covering several services; tries each mirror in turn. */
async function queryOverpass(lat: number, lon: number, services: readonly ServiceType[], radiusM: number) {
  const clauses = services.flatMap((s) => FILTERS[s]).map((f) => `${f}(around:${radiusM},${lat},${lon});`);
  const query = `[out:json][timeout:55];(${clauses.join("")});out center tags 300;`;
  let lastError: unknown;
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: new URLSearchParams({ data: query }),
        // The public Overpass servers can take 30s+ when busy.
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status} from ${new URL(url).host}`);
      return ((await res.json()) as { elements: OverpassElement[] }).elements;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function pickNearest(lat: number, lon: number, elements: OverpassElement[], into: Nearest) {
  for (const el of elements) {
    const eLat = el.lat ?? el.center?.lat;
    const eLon = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const service = classify(tags);
    if (eLat == null || eLon == null || !tags.name || !service) continue;
    const distanceKm = haversineKm(lat, lon, eLat, eLon);
    const best = into[service];
    if (best && distanceKm >= best.distanceKm) continue;
    into[service] = {
      name: tags.name,
      address: formatAddress(tags),
      phone: tags.phone || tags["contact:phone"] || null,
      lat: eLat,
      lon: eLon,
      distanceKm: Math.round(distanceKm * 10) / 10,
      etaMin: estimateEta(distanceKm),
      mapUrl: `https://www.openstreetmap.org/?mlat=${eLat}&mlon=${eLon}#map=16/${eLat}/${eLon}`,
    };
  }
}

async function lookup(lat: number, lon: number): Promise<Nearest> {
  const nearest: Nearest = { ambulance: null, police: null, fire: null };
  pickNearest(lat, lon, await queryOverpass(lat, lon, SERVICES, 8_000), nearest);
  // Rural areas: widen the search only for services still missing.
  const missing = SERVICES.filter((s) => !nearest[s]);
  if (missing.length) pickNearest(lat, lon, await queryOverpass(lat, lon, missing, 50_000), nearest);
  return nearest;
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
