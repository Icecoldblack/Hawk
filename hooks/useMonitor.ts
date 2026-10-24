"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { MotionGate } from "@/lib/motion";
import type { AnalyzeResponse, EventType, Verdict } from "@/lib/types";

const TICK_MS = 500;
const MIN_SEND_GAP_MS = 2000;
const HEARTBEAT_MS = 6000;
const MOTION_HOLD_MS = 1500;

export type MonitorState = {
  motionScore: number;
  motion: boolean;
  analyzing: boolean;
  lastVerdict: Verdict | null;
  votes: { eventType: EventType; count: number; avgConfidence: number } | null;
  latencyMs: number | null;
  model: string | null;
  calls: number;
  error: string | null;
  lastTrigger: "motion" | "heartbeat" | null;
};

const INITIAL: MonitorState = {
  motionScore: 0,
  motion: false,
  analyzing: false,
  lastVerdict: null,
  votes: null,
  latencyMs: null,
  model: null,
  calls: 0,
  error: null,
  lastTrigger: null,
};

/**
 * Runs the motion gate on the video every 500ms, keeps a rolling buffer of
 * the last 3 frames, and sends them to /api/analyze on motion (at most every
 * 2s) or every 6s as a heartbeat.
 */
export function useMonitor(
  videoRef: RefObject<HTMLVideoElement | null>,
  opts: { enabled: boolean; cameraId: string; motionThreshold: number; onIncident?: () => void },
) {
  const [state, setState] = useState<MonitorState>(INITIAL);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.enabled) {
      setState((s) => ({ ...s, motion: false, analyzing: false, motionScore: 0 }));
      return;
    }
    const gate = new MotionGate();
    const buffer: string[] = [];
    let lastMotionAt = 0;
    let lastSendAt = 0;
    let inFlight = false;
    let cancelled = false;

    async function send(trigger: "motion" | "heartbeat") {
      inFlight = true;
      lastSendAt = Date.now();
      setState((s) => ({ ...s, analyzing: true, lastTrigger: trigger }));
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames: [...buffer], cameraId: optsRef.current.cameraId }),
        });
        const data = (await res.json()) as AnalyzeResponse;
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setState((s) => ({
          ...s,
          lastVerdict: data.verdict,
          votes: data.votes,
          latencyMs: data.latencyMs,
          model: data.model ?? null,
          calls: s.calls + 1,
          error: null,
        }));
        if (data.incident) optsRef.current.onIncident?.();
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof TypeError ? "Network unreachable" : err instanceof Error ? err.message : "Analyze failed";
          setState((s) => ({ ...s, error: message }));
        }
      } finally {
        inFlight = false;
        if (!cancelled) setState((s) => ({ ...s, analyzing: false }));
      }
    }

    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      const now = Date.now();
      const score = gate.sample(video);
      if (score > optsRef.current.motionThreshold) lastMotionAt = now;
      const motion = now - lastMotionAt < MOTION_HOLD_MS;

      buffer.push(gate.grab(video));
      while (buffer.length > 3) buffer.shift();

      setState((s) => ({ ...s, motionScore: score, motion }));

      if (inFlight || buffer.length < 3) return;
      if (motion && now - lastSendAt >= MIN_SEND_GAP_MS) void send("motion");
      else if (now - lastSendAt >= HEARTBEAT_MS) void send("heartbeat");
    }, TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      gate.reset();
    };
  }, [opts.enabled, videoRef]);

  return state;
}
