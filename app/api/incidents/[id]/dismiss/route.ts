import { NextResponse } from "next/server";
import { dismiss } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Operator marks an incident as a false alarm. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = dismiss(id);
  if (!incident) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ incident });
}
