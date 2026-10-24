import { NextResponse } from "next/server";
import { acknowledge } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = acknowledge(id);
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ incident });
}
