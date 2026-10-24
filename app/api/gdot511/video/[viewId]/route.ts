import { NextResponse } from "next/server";
import { fetchGdotVideoUrl, GdotError } from "@/lib/gdot511";

export const dynamic = "force-dynamic";

// GET /api/gdot511/video/18551 → { url: "https://…/playlist.m3u8?token=…" }
// Tokens expire ~2min, so always fetch fresh right before playing/extracting.
export async function GET(_req: Request, { params }: { params: Promise<{ viewId: string }> }) {
  const { viewId } = await params;
  const id = Number(viewId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "viewId must be a positive integer" }, { status: 400 });
  }
  try {
    const url = await fetchGdotVideoUrl(id);
    return NextResponse.json({ viewId: id, url });
  } catch (e) {
    const status = e instanceof GdotError ? e.status : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "video lookup failed" }, { status });
  }
}
