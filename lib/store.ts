import type { Incident, UserLocation, Verdict } from "./types";

/** A verdict plus the frame it was made on, so a confirmed incident can show it. */
export type VerdictEntry = { verdict: Verdict; snapshot: string };

type Store = {
  incidents: Incident[];
  history: Map<string, VerdictEntry[]>; // cameraId -> last 3 verdicts
  location: UserLocation | null; // where the camera is, for simulated dispatch
};

// In-memory store for the demo. Pinned to globalThis so dev hot reloads keep it.
const g = globalThis as typeof globalThis & { __hawksightStore?: Store };
export const store: Store = (g.__hawksightStore ??= { incidents: [], history: new Map(), location: null });
store.location ??= null;

const MAX_INCIDENTS = 50;

export function pushVerdict(cameraId: string, entry: VerdictEntry): VerdictEntry[] {
  const list = store.history.get(cameraId) ?? [];
  list.push(entry);
  while (list.length > 3) list.shift();
  store.history.set(cameraId, list);
  return list;
}

export function addIncident(incident: Incident) {
  store.incidents.unshift(incident);
  if (store.incidents.length > MAX_INCIDENTS) store.incidents.length = MAX_INCIDENTS;
}

export function listIncidents(): Incident[] {
  return store.incidents;
}

export function acknowledge(id: string): Incident | null {
  const incident = store.incidents.find((i) => i.id === id);
  if (!incident) return null;
  incident.status = "acknowledged";
  incident.ackTs ??= Date.now();
  return incident;
}

export function dismiss(id: string): Incident | null {
  const incident = store.incidents.find((i) => i.id === id);
  if (!incident) return null;
  incident.status = "dismissed";
  incident.ackTs ??= Date.now();
  return incident;
}

export function findIncident(id: string): Incident | null {
  return store.incidents.find((i) => i.id === id) ?? null;
}

export function clearIncidents() {
  store.incidents.length = 0;
  store.history.clear();
}
