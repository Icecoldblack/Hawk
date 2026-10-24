import { NextResponse } from "next/server";
import { clearIncidents, listIncidents } from "@/lib/store";

export const dynamic = "force-dynamic";

// Snapshots are served separately (see [id]/snapshot) so the 2s poll stays small.
export async function GET() {
  const incidents = listIncidents().map(({ snapshot, ...rest }) => ({ ...rest, snapshot: snapshot ? `/api/incidents/${rest.id}/snapshot` : "" }));
  return NextResponse.json({ incidents });
}

export async function DELETE() {
  clearIncidents();
  return NextResponse.json({ ok: true });
}
