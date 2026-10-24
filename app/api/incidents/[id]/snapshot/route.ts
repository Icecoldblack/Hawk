import { listIncidents } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = listIncidents().find((i) => i.id === id);
  const match = incident && /^data:([^;]+);base64,(.+)$/.exec(incident.snapshot);
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "private, max-age=3600" },
  });
}
