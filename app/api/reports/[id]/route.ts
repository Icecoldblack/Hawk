import { NextResponse } from "next/server";
import { findIncident } from "@/lib/store";
import { SERVICE_LABELS, type Dispatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the reporter is allowed to see: the review stage and, once a human has
 * confirmed, which responders are on the way with an ETA. Never the snapshot,
 * the AI's notes or any other incident.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = findIncident(id);
  if (!incident || incident.source !== "report") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stage = incident.status === "open" ? "reviewing" : incident.status === "dismissed" ? "dismissed" : "dispatched";
  const dispatches = [incident.dispatch, ...(incident.extraDispatches ?? [])].filter((d): d is Dispatch => !!d);
  const ackTs = incident.ackTs ?? Date.now();
  const responders =
    stage === "dispatched"
      ? dispatches.map((d) => ({
          service: d.service,
          label: SERVICE_LABELS[d.service],
          station: d.station?.name ?? null,
          etaMin: d.station?.etaMin ?? null,
          arrivesAt: d.station ? ackTs + d.station.etaMin * 60_000 : null,
        }))
      : [];
  return NextResponse.json({ id, stage, submittedAt: incident.ts, confirmedAt: incident.ackTs ?? null, responders });
}
