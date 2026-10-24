import { NextResponse } from "next/server";
import { sendDiscordAlert } from "@/lib/alerts";
import { simulateDispatch } from "@/lib/dispatch";
import { addIncident } from "@/lib/store";
import type { Incident, Verdict } from "@/lib/types";
import { analyzeFrames } from "@/lib/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FRAMES = 4;
const MAX_NOTE = 500;

/**
 * A member of the public reports an emergency: a few frames from their video,
 * an optional note and their location. The AI reviews the frames, then the
 * report lands on the admin dashboard as an open incident for a human to
 * confirm. Nothing is dispatched to the reporter until that happens.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const frames: string[] = Array.isArray(body?.frames) ? body.frames.filter((f: unknown) => typeof f === "string").slice(0, MAX_FRAMES) : [];
  if (frames.length === 0) return NextResponse.json({ error: "Add a video so we can see what is happening." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : "";
  const { lat, lon } = body.location ?? {};
  const location = typeof lat === "number" && typeof lon === "number" && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : undefined;

  // If the AI is down the report must still reach a human, so fall back to "needs review".
  let verdict: Verdict;
  try {
    verdict = (await analyzeFrames(frames, note || undefined)).verdict;
  } catch (err) {
    console.error("report analysis failed:", err instanceof Error ? err.message : err);
    verdict = { ts: Date.now(), eventType: "none", severity: 3, confidence: 0, description: "AI review unavailable. Check the video." };
  }

  const incident: Incident = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    cameraId: "citizen-report",
    eventType: verdict.eventType,
    severity: verdict.severity,
    confidence: verdict.confidence,
    description: verdict.description,
    snapshot: frames[Math.floor(frames.length / 2)],
    status: "open",
    alerted: false,
    source: "report",
    reporterNote: note || undefined,
    location,
  };
  addIncident(incident);
  // Unclear reports get no automatic responder: the operator picks one.
  if (incident.eventType !== "none") incident.dispatch = await simulateDispatch(incident);
  incident.alerted = await sendDiscordAlert(incident);
  return NextResponse.json({ id: incident.id });
}
