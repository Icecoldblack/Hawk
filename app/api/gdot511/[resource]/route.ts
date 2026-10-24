import { NextResponse } from "next/server";
import { fetchGdot, GdotError, GDOT_RESOURCES, type GdotResource } from "@/lib/gdot511";

export const dynamic = "force-dynamic";

// GET /api/gdot511/cameras | event | alerts | messagesigns | ...
export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!GDOT_RESOURCES.includes(resource as GdotResource)) {
    return NextResponse.json(
      { error: `Unknown resource "${resource}". Valid: ${GDOT_RESOURCES.join(", ")}` },
      { status: 404 },
    );
  }
  try {
    const data = await fetchGdot(resource as GdotResource);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof GdotError ? e.status : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "GDOT fetch failed" }, { status });
  }
}
