import { NextResponse } from "next/server";
import { GDOT_RESOURCES } from "@/lib/gdot511";

export const dynamic = "force-dynamic";

// GET /api/gdot511 — discovery endpoint: which resources exist and whether the key is configured.
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.GDOT_511_API_KEY),
    resources: GDOT_RESOURCES.map((r) => ({ name: r, url: `/api/gdot511/${r}` })),
  });
}
