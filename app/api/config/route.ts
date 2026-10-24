import { NextResponse } from "next/server";
import { MIN_CONFIDENCE } from "@/lib/confirm";
import type { AppConfig } from "@/lib/types";
import { VISION_MODEL } from "@/lib/vision";

export const dynamic = "force-dynamic";

export async function GET() {
  const config: AppConfig = {
    motionThreshold: Number(process.env.MOTION_THRESHOLD ?? 8),
    minConfidence: MIN_CONFIDENCE,
    visionConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: VISION_MODEL,
  };
  return NextResponse.json(config);
}
