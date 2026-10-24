import { NextResponse } from "next/server";
import { simulateDispatch } from "@/lib/dispatch";
import { listIncidents } from "@/lib/store";
import { SERVICE_FOR, type ServiceType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVICES: ServiceType[] = ["ambulance", "police", "fire"];

/** A human operator adds another (simulated) responder to an incident. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { service } = await req.json().catch(() => ({}));
  if (!SERVICES.includes(service)) return NextResponse.json({ error: "service must be ambulance, police or fire" }, { status: 400 });

  const incident = listIncidents().find((i) => i.id === id);
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (service === SERVICE_FOR[incident.eventType] || incident.extraDispatches?.some((d) => d.service === service)) {
    return NextResponse.json({ error: "Already dispatched" }, { status: 409 });
  }

  const dispatch = await simulateDispatch(incident, 3000, service);
  (incident.extraDispatches ??= []).push(dispatch);
  return NextResponse.json({ incident });
}
