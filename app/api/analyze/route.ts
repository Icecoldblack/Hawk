import { ApiError } from "@google/genai";
import { NextResponse } from "next/server";
import { confirm, tally } from "@/lib/confirm";
import { simulateDispatch } from "@/lib/dispatch";
import { addIncident, listIncidents, pushVerdict } from "@/lib/store";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";
import { analyzeFrames } from "@/lib/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(err: unknown): string {
  if (!process.env.GEMINI_API_KEY) {
    return "No GEMINI_API_KEY set. Add it to .env.local and restart the dev server.";
  }
  if (err instanceof ApiError) {
    if (err.status === 400 && /api key/i.test(err.message)) return "Gemini API key is invalid.";
    if (err.status === 401 || err.status === 403) return "Gemini API key is invalid or lacks access to this model.";
    if (err.status === 404) return "Gemini model not found. Check GEMINI_MODEL in .env.local.";
    if (err.status === 429) return "Gemini rate limit or quota hit, retrying.";
    return `Gemini API error ${err.status}`;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export async function POST(req: Request) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const frames = Array.isArray(body.frames) ? body.frames.slice(-3) : [];
  const cameraId = typeof body.cameraId === "string" && body.cameraId ? body.cameraId : "cam-1";
  if (frames.length === 0) return NextResponse.json({ error: "No frames" }, { status: 400 });

  const started = Date.now();
  try {
    const { verdict, model } = await analyzeFrames(frames);
    // Snapshot is the middle frame of the window the verdict was made on.
    const snapshot = frames[Math.floor(frames.length / 2)];
    const history = pushVerdict(cameraId, { verdict, snapshot });

    const incident = confirm(cameraId, history, listIncidents());
    if (incident) {
      addIncident(incident);
      incident.dispatch = await simulateDispatch(incident);
    }

    const votes = tally(history);
    const res: AnalyzeResponse = {
      verdict,
      votes: votes && { eventType: votes.eventType, count: votes.count, avgConfidence: votes.avgConfidence },
      incident,
      model,
      latencyMs: Date.now() - started,
    };
    return NextResponse.json(res);
  } catch (err) {
    console.error("analyze failed:", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 502 });
  }
}
