import { NextResponse } from "next/server";
import { cachedStations, warmDispatchCache } from "@/lib/dispatch";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current camera location plus the nearest stations, once the background lookup has finished. */
export async function GET() {
  const loc = store.location;
  if (!loc) return NextResponse.json({ location: null, stations: null });
  return NextResponse.json({ location: loc, stations: cachedStations(loc.lat, loc.lon) });
}

export async function POST(req: Request) {
  const { lat, lon, accuracy } = await req.json().catch(() => ({}));
  if (typeof lat !== "number" || typeof lon !== "number" || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "lat and lon are required numbers" }, { status: 400 });
  }
  store.location = { lat, lon, accuracy: typeof accuracy === "number" ? accuracy : null, ts: Date.now() };
  warmDispatchCache(lat, lon);
  return NextResponse.json({ location: store.location });
}

export async function DELETE() {
  store.location = null;
  return NextResponse.json({ ok: true });
}
