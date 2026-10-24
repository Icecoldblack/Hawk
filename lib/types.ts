export const EVENT_TYPES = ["fall", "fight", "fire_smoke", "person_down", "none"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Severity = 1 | 2 | 3 | 4 | 5;

export type Verdict = {
  ts: number;
  eventType: EventType;
  severity: Severity;
  confidence: number; // 0 to 1
  description: string;
};

export type ServiceType = "ambulance" | "police" | "fire";

export type Station = {
  name: string;
  address: string | null;
  phone: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  etaMin: number;
  mapUrl: string;
};

/** A pretend dispatch to the nearest real station. Nobody is ever contacted. */
export type Dispatch = {
  simulated: true;
  service: ServiceType;
  status: "searching" | "notified" | "no_location" | "not_found" | "error";
  station: Station | null;
  ts: number;
};

export type UserLocation = { lat: number; lon: number; accuracy: number | null; ts: number };

export type Incident = {
  id: string;
  ts: number;
  cameraId: string;
  eventType: EventType;
  severity: number;
  confidence: number;
  description: string;
  snapshot: string; // data URL of the middle frame
  status: "open" | "acknowledged" | "dismissed";
  /** When a human acknowledged it. For citizen reports this is when responders are confirmed. */
  ackTs?: number;
  /** Where the incident is. Citizen reports carry the reporter's location; camera incidents use the camera's. */
  location?: { lat: number; lon: number };
  /** "report" = submitted by a member of the public. Missing means a camera. */
  source?: "camera" | "report";
  reporterNote?: string;
  dispatch?: Dispatch;
  /** Extra services a human operator added before acknowledging. */
  extraDispatches?: Dispatch[];
  test?: boolean;
};

export type AnalyzeRequest = {
  frames: string[]; // JPEG data URLs, oldest first
  cameraId: string;
};

export type AnalyzeResponse = {
  verdict: Verdict;
  /** How many of the last 3 verdicts match the leading non-none type. */
  votes: { eventType: EventType; count: number; avgConfidence: number } | null;
  incident: Incident | null;
  /** Which Gemini model answered (may be a fallback). */
  model?: string;
  latencyMs: number;
  error?: string;
};

export type AppConfig = {
  motionThreshold: number;
  minConfidence: number;
  visionConfigured: boolean;
  model: string;
};

export const SERVICE_FOR: Record<EventType, ServiceType> = {
  fall: "ambulance",
  person_down: "ambulance",
  fight: "police",
  fire_smoke: "fire",
  none: "ambulance",
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  ambulance: "Ambulance / EMS",
  police: "Police",
  fire: "Fire department",
};

export const EVENT_LABELS: Record<EventType, string> = {
  fall: "Fall",
  fight: "Fight",
  fire_smoke: "Fire / Smoke",
  person_down: "Person down",
  none: "Clear",
};

/** Label for an incident; an unclear citizen report still needs a human to look at it. */
export function incidentLabel(i: Pick<Incident, "eventType" | "source">) {
  return i.eventType === "none" && i.source === "report" ? "Needs review" : EVENT_LABELS[i.eventType];
}
