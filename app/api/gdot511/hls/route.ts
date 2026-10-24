import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HLS proxy for GDOT live streams. Their stream hosts have inconsistent CORS
 * headers, so the browser can't always fetch them directly — we fetch
 * server-side instead. m3u8 playlists get their nested URIs rewritten back
 * through this route so every subsequent request stays same-origin (which also
 * keeps canvas frame-grabs untainted).
 */

const ALLOWED_HOST = /^([a-z0-9-]+\.)*dot\.ga\.gov$/i;

function proxyUri(uri: string, base: string) {
  const abs = new URL(uri, base).toString();
  return `/api/gdot511/hls?u=${encodeURIComponent(abs)}`;
}

// GET /api/gdot511/hls?u=<urlencoded upstream m3u8/ts url>
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  if (!raw) return NextResponse.json({ error: "u param required" }, { status: 400 });

  let upstream: URL;
  try {
    upstream = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid u param" }, { status: 400 });
  }
  if (upstream.protocol !== "https:" || !ALLOWED_HOST.test(upstream.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  let res: Response;
  try {
    res = await fetch(upstream, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  } catch {
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ error: `Upstream returned ${res.status}` }, { status: res.status });

  const type = res.headers.get("content-type") ?? "";

  // Playlist: rewrite nested chunklist/segment URIs through this proxy.
  if (type.includes("mpegurl") || upstream.pathname.endsWith(".m3u8")) {
    const base = upstream.toString();
    const rewritten = (await res.text())
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") && trimmed.includes('URI="')) {
          return line.replace(/URI="([^"]+)"/, (_m, uri) => `URI="${proxyUri(uri, base)}"`);
        }
        if (!trimmed || trimmed.startsWith("#")) return line;
        return proxyUri(trimmed, base);
      })
      .join("\n");
    return new NextResponse(rewritten, {
      headers: { "content-type": "application/vnd.apple.mpegurl", "cache-control": "no-store" },
    });
  }

  // Binary .ts segment (or anything else): stream through untouched.
  return new NextResponse(res.body, {
    headers: { "content-type": type || "video/mp2t", "cache-control": "no-store" },
  });
}
