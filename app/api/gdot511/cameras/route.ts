import { NextResponse } from "next/server";
import { fetchGdotCameras, GdotError, toCameraOption } from "@/lib/gdot511";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/gdot511/cameras → trimmed list for the picker (shadows the generic
 * [resource] proxy for "cameras"). ~4300 rows × small fields instead of the
 * raw 2.3MB payload.
 */
export async function GET() {
  try {
    const cameras = (await fetchGdotCameras()).map(toCameraOption).filter((c) => c !== null);
    return NextResponse.json({ cameras });
  } catch (e) {
    const status = e instanceof GdotError ? e.status : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "camera list failed" }, { status });
  }
}
