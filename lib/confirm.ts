import type { VerdictEntry } from "./store";
import type { EventType, Incident } from "./types";

export const MIN_CONFIDENCE = Number(process.env.CONFIRM_MIN_CONFIDENCE ?? 0.6);
export const COOLDOWN_MS = 60_000;

export type Votes = { eventType: EventType; count: number; avgConfidence: number; matches: VerdictEntry[] };

/** Find the non-none event type with the most votes in the window. */
export function tally(history: VerdictEntry[]): Votes | null {
  const groups = new Map<EventType, VerdictEntry[]>();
  for (const entry of history) {
    if (entry.verdict.eventType === "none") continue;
    const list = groups.get(entry.verdict.eventType) ?? [];
    list.push(entry);
    groups.set(entry.verdict.eventType, list);
  }
  let best: Votes | null = null;
  for (const [eventType, matches] of groups) {
    const avgConfidence = matches.reduce((s, m) => s + m.verdict.confidence, 0) / matches.length;
    if (!best || matches.length > best.count || (matches.length === best.count && avgConfidence > best.avgConfidence)) {
      best = { eventType, count: matches.length, avgConfidence, matches };
    }
  }
  return best;
}

/**
 * 2 of 3 rule: at least 2 of the last 3 verdicts share a non-none type, their
 * average confidence is at least MIN_CONFIDENCE, and no incident of that type
 * fired for this camera in the last 60 seconds.
 */
export function confirm(
  cameraId: string,
  history: VerdictEntry[],
  incidents: Incident[],
  now = Date.now(),
): Incident | null {
  const votes = tally(history);
  if (!votes || votes.count < 2 || votes.avgConfidence < MIN_CONFIDENCE) return null;

  const inCooldown = incidents.some(
    (i) => i.cameraId === cameraId && i.eventType === votes.eventType && !i.test && now - i.ts < COOLDOWN_MS,
  );
  if (inCooldown) return null;

  const latest = votes.matches[votes.matches.length - 1];
  return {
    id: crypto.randomUUID(),
    ts: now,
    cameraId,
    eventType: votes.eventType,
    severity: Math.max(...votes.matches.map((m) => m.verdict.severity)),
    confidence: votes.avgConfidence,
    description: latest.verdict.description,
    snapshot: latest.snapshot,
    status: "open",
  };
}
