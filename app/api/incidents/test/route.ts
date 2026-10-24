import { NextResponse } from "next/server";
import { sendDiscordAlert } from "@/lib/alerts";
import { simulateDispatch } from "@/lib/dispatch";
import { addIncident } from "@/lib/store";
import type { Incident } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates a clearly labelled test incident so you can check the dashboard and phone alert. */
export async function POST(req: Request) {
  const { snapshot = "", cameraId = "cam-1" } = await req.json().catch(() => ({}));
  const incident: Incident = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    cameraId,
    eventType: "fall",
    severity: 4,
    confidence: 0.9,
    description: "Test alert from Hawk. No real event was detected.",
    snapshot: typeof snapshot === "string" ? snapshot : "",
    status: "open",
    alerted: false,
    test: true,
  };
  addIncident(incident);
  incident.dispatch = await simulateDispatch(incident);
  incident.alerted = await sendDiscordAlert(incident);
  return NextResponse.json({ incident });
}
