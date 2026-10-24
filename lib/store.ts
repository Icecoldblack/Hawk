import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Incident, UserLocation, Verdict } from "./types";

/** A verdict plus the frame it was made on, so a confirmed incident can show it. */
export type VerdictEntry = { verdict: Verdict; snapshot: string };

type Store = {
  incidents: Incident[];
  history: Map<string, VerdictEntry[]>; // cameraId -> last 3 verdicts
  location: UserLocation | null; // where the camera is, for simulated dispatch
};

const MAX_INCIDENTS = 50;

// Incidents are mirrored to disk so a server restart never loses a report.
const DATA_DIR = join(process.cwd(), ".data");
const DATA_FILE = join(DATA_DIR, "incidents.json");

function loadIncidents(): Incident[] {
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed.slice(0, MAX_INCIDENTS) : [];
  } catch {
    return [];
  }
}

// In-memory store for the demo. Pinned to globalThis so dev hot reloads keep it.
const g = globalThis as typeof globalThis & { __hawksightStore?: Store; __hawksightSaver?: boolean };
export const store: Store = (g.__hawksightStore ??= { incidents: loadIncidents(), history: new Map(), location: null });
store.location ??= null;

// Incidents are mutated in place from several routes (dispatch lookups finish
// late), so a light timer saves whenever anything but the large snapshots changed.
let lastSaved = "";
function saveIncidents() {
  try {
    const sig = JSON.stringify(store.incidents, (k, v) => (k === "snapshot" ? undefined : v));
    if (sig === lastSaved) return;
    mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(store.incidents));
    renameSync(tmp, DATA_FILE);
    lastSaved = sig;
  } catch (err) {
    console.error("Could not save incidents:", err instanceof Error ? err.message : err);
  }
}
if (!g.__hawksightSaver) {
  g.__hawksightSaver = true;
  setInterval(saveIncidents, 1000).unref();
}

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
  saveIncidents();
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
  saveIncidents();
}
