import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Georgia viewbox keeps "Peachtree" / "I-75" inside the state (left,top,right,bottom).
const GA_VIEWBOX = "-85.61,35.0,-80.75,30.35";

// GET /api/geocode?q=<address> → { result: { label, lat, lng } | null }
// Uses Nominatim (OSM) — free, no key. Polite UA + server-side only.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ result: null });

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
      `&format=json&limit=1&countrycodes=us&viewbox=${GA_VIEWBOX}&bounded=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "hawk-demo/0.1 (hackathon; camera picker geocoding)" },
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    const best = data[0];
    if (!best) return NextResponse.json({ result: null });
    return NextResponse.json({
      result: { label: best.display_name.split(",").slice(0, 3).join(","), lat: Number(best.lat), lng: Number(best.lon) },
    });
  } catch {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }
}
