"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Broadcast,
  Brain,
  MapPin,
  PaperPlaneTilt,
  Play,
  ShieldCheck,
  Stop,
  Trash,
  UploadSimple,
  VideoCamera,
  VideoCameraSlash,
  WarningCircle,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { useIncidents } from "@/hooks/useIncidents";
import { useLocation, type LocationState } from "@/hooks/useLocation";
import { useMonitor } from "@/hooks/useMonitor";
import { playAlarm, unlockAudio } from "@/lib/sound";
import type { AppConfig } from "@/lib/types";
import { IncidentCard } from "./IncidentCard";
import { StationMap } from "./StationMap";
import { StatusPill, type MonitorStatus } from "./StatusPill";

type Source = "webcam" | "clip1" | "clip2" | "clip3" | "upload";

const SOURCES: { value: Source; label: string }[] = [
  { value: "webcam", label: "Webcam" },
  { value: "clip1", label: "Clip 1 · Fall" },
  { value: "clip2", label: "Clip 2 · Fight" },
  { value: "clip3", label: "Clip 3 · Fire" },
  { value: "upload", label: "Upload a video…" },
];

const CAMERA_ID = "cam-1";

export function MonitorDashboard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>("webcam");
  const [retry, setRetry] = useState(0);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [armed, setArmed] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [now, setNow] = useState(0); // set after mount to avoid a hydration mismatch
  const [testing, setTesting] = useState(false);

  const onNewIncident = useCallback(() => {
    playAlarm();
    setFlashKey((k) => k + 1);
  }, []);

  const { incidents, error: pollError, acknowledge, dismiss, addDispatch, clearAll, refresh } = useIncidents(onNewIncident);
  const { state: locationState, locate } = useLocation();
  const monitor = useMonitor(videoRef, {
    enabled: armed && playing,
    cameraId: CAMERA_ID,
    motionThreshold: config?.motionThreshold ?? 8,
    onIncident: refresh,
  });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => null);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const openCount = incidents.filter((i) => i.status === "open").length;
  useEffect(() => {
    document.title = openCount > 0 ? `ALERT (${openCount}) · Raven` : "Live monitor · Raven";
  }, [openCount]);

  // Attach the selected source to the video element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setVideoError(null);
    setPlaying(false);
    video.srcObject = null;
    video.removeAttribute("src");

    if (source === "webcam") {
      if (!navigator.mediaDevices?.getUserMedia) {
        setVideoError("This browser cannot access a webcam. Use a clip instead.");
        return;
      }
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then((s) => {
          if (cancelled) return s.getTracks().forEach((t) => t.stop());
          stream = s;
          video.srcObject = s;
          void video.play().catch(() => null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const name = err instanceof DOMException ? err.name : "";
          setVideoError(
            name === "NotAllowedError"
              ? "Camera access is blocked. Allow it from the camera icon in the address bar, or open this page in Chrome or Edge."
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? "No camera was found. Plug one in, or pick a clip instead."
                : name === "NotReadableError"
                  ? "The camera is busy in another app (Zoom, Teams, Camera). Close it and try again."
                  : "Could not start the camera. Try again, or pick a clip instead.",
          );
        });
    } else if (source === "upload") {
      if (uploadUrl) {
        video.src = uploadUrl;
        void video.play().catch(() => null);
      }
    } else {
      // Check the clip exists first; a missing file can leave the video loading forever.
      const url = `/clips/${source}.mp4`;
      fetch(url, { method: "HEAD" })
        .then((r) => {
          if (cancelled) return;
          if (!r.ok) throw new Error();
          video.src = url;
          void video.play().catch(() => null);
        })
        .catch(() => {
          if (!cancelled) setVideoError(`No clip found at public/clips/${source}.mp4. Drop a video there, or upload one.`);
        });
    }

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [source, uploadUrl, retry]);

  function onSourceChange(value: Source) {
    if (value === "upload") fileRef.current?.click();
    setSource(value);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadUrl) URL.revokeObjectURL(uploadUrl);
    setUploadUrl(URL.createObjectURL(file));
    setSource("upload");
  }

  function toggleArmed() {
    unlockAudio();
    if (!armed && locationState.status === "unknown") locate();
    setArmed((a) => !a);
  }

  async function sendTest() {
    unlockAudio();
    setTesting(true);
    let snapshot = "";
    const video = videoRef.current;
    if (video && video.videoWidth) {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = Math.round((640 * video.videoHeight) / video.videoWidth);
      c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
      snapshot = c.toDataURL("image/jpeg", 0.6);
    }
    await fetch("/api/incidents/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot, cameraId: CAMERA_ID }),
    }).catch(() => null);
    await refresh();
    setTesting(false);
  }

  const status: MonitorStatus = openCount > 0 ? "alert" : !armed ? "standby" : monitor.motion ? "motion" : "monitoring";
  const threshold = config?.motionThreshold ?? 8;
  const meter = Math.min(100, (monitor.motionScore / (threshold * 3)) * 100);
  const v = monitor.lastVerdict;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-line-strong sm:block" />
            <span className="hidden font-mono text-xs uppercase tracking-widest text-faint sm:block">Live monitor</span>
          </div>
          <div className="flex items-center gap-2">
            <SystemChip ok={config?.visionConfigured} icon={<Brain size={14} weight="bold" />} label={config ? config.model : "Vision"} />
            <LocationChip state={locationState} onLocate={locate} />
            <button
              type="button"
              onClick={sendTest}
              disabled={testing}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-wait disabled:opacity-50"
            >
              <PaperPlaneTilt size={16} weight="bold" aria-hidden />
              <span className="hidden sm:inline">{testing ? "Sending…" : "Send test alert"}</span>
            </button>
          </div>
        </div>
      </header>

      {pollError && (
        <div role="alert" className="border-b border-red/50 bg-red/15 px-4 py-2 text-center text-sm font-medium text-red-bright">
          <WarningCircle size={16} weight="bold" className="mr-1.5 inline -translate-y-px" aria-hidden />
          {pollError}
        </div>
      )}

      <main id="main" className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
        {/* Left: video */}
        <section aria-label="Camera feed" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusPill status={status} />
              {monitor.analyzing && (
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  <span className="animate-blink">●</span> analyzing
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="source" className="sr-only">
                Video source
              </label>
              <div className="relative">
                <VideoCamera size={16} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
                <select
                  id="source"
                  value={source}
                  onChange={(e) => onSourceChange(e.target.value as Source)}
                  className="h-10 cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface-2 pl-9 pr-8 text-sm font-medium outline-none transition-colors hover:border-white/30 focus-visible:border-red-bright"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint" aria-hidden>
                  ▾
                </span>
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onFile} />
              <button
                type="button"
                onClick={toggleArmed}
                className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                  armed ? "border border-line-strong bg-surface-2 text-fg hover:bg-surface-3" : "bg-red text-white hover:bg-red-bright"
                }`}
                aria-pressed={armed}
              >
                {armed ? <Stop size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
                {armed ? "Stop" : "Start monitoring"}
              </button>
            </div>
          </div>

          <div
            className={`relative aspect-video overflow-hidden rounded-2xl border bg-black ${
              status === "alert" ? "border-red animate-pulse-border" : "border-line-strong"
            }`}
          >
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              muted
              loop
              playsInline
              autoPlay
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                if (source !== "webcam" && source !== "upload") {
                  setVideoError(`No clip found at public/clips/${source}.mp4. Drop a video there, or upload one.`);
                }
              }}
            />

            {/* HUD overlay */}
            <div className="pointer-events-none absolute inset-0">
              {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "left-4 bottom-4 border-l-2 border-b-2", "right-4 bottom-4 border-r-2 border-b-2"].map((c) => (
                <span key={c} className={`absolute h-6 w-6 border-white/40 ${c}`} />
              ))}
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-white/80">
                <span className={`h-2 w-2 rounded-full ${armed && playing ? "bg-red-bright animate-blink" : "bg-faint"}`} />
                {CAMERA_ID} · {SOURCES.find((s) => s.value === source)?.label}
              </div>
              <div className="absolute right-6 top-6 rounded bg-black/60 px-2 py-1 font-mono text-[11px] tabular-nums text-white/80">
                {now ? new Date(now).toLocaleTimeString() : "--:--:--"}
              </div>
              {armed && playing && <div className="absolute inset-x-0 top-0 h-[8%] animate-scan bg-gradient-to-b from-transparent via-red/15 to-transparent" />}
              {flashKey > 0 && <div key={flashKey} className="absolute inset-0 animate-flash bg-red" />}
            </div>

            {!playing && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
                <div className="max-w-sm">
                  {videoError ? (
                    <>
                      <VideoCameraSlash size={40} weight="bold" className="mx-auto text-red-bright" aria-hidden />
                      <p className="mt-3 font-medium">{videoError}</p>
                      {source === "webcam" && (
                        <button
                          type="button"
                          onClick={() => setRetry((r) => r + 1)}
                          className="pointer-events-auto mr-2 mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-bright"
                        >
                          <VideoCamera size={16} weight="bold" aria-hidden />
                          Try camera again
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="pointer-events-auto mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold transition-colors hover:bg-white/5"
                      >
                        <UploadSimple size={16} weight="bold" aria-hidden />
                        Upload a video
                      </button>
                    </>
                  ) : (
                    <p className="font-mono text-sm uppercase tracking-widest text-muted">Waiting for video…</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Debug line */}
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-[180px] flex-1">
                <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-faint">
                  <span>Motion</span>
                  <span className="tabular-nums">
                    <span className={monitor.motionScore > threshold ? "text-sev-mid" : "text-fg"}>{monitor.motionScore.toFixed(1)}</span> / thr {threshold}
                  </span>
                </div>
                <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${monitor.motionScore > threshold ? "bg-sev-mid" : "bg-white/40"}`}
                    style={{ width: `${meter}%` }}
                  />
                  <span className="absolute inset-y-0 w-px bg-red-bright" style={{ left: "33.3%" }} aria-hidden />
                </div>
              </div>
              <Stat label="Votes" value={monitor.votes ? `${monitor.votes.count}/3 ${monitor.votes.eventType}` : "0/3"} hot={(monitor.votes?.count ?? 0) >= 2} />
              <Stat label="Avg conf" value={monitor.votes ? monitor.votes.avgConfidence.toFixed(2) : "–"} />
              <Stat label="Latency" value={monitor.latencyMs ? `${(monitor.latencyMs / 1000).toFixed(1)}s` : "–"} />
              <Stat label="Checks" value={String(monitor.calls)} />
            </div>
            <p className="mt-3 truncate border-t border-line pt-3 font-mono text-xs text-muted" title={v?.description}>
              <span className="text-faint">last verdict ›</span>{" "}
              {v ? (
                <>
                  <span className={v.eventType === "none" ? "text-sev-low" : "font-bold text-red-bright"}>{v.eventType}</span> sev {v.severity} · conf{" "}
                  {v.confidence.toFixed(2)} · {monitor.lastTrigger}
                  {monitor.model && monitor.model !== config?.model ? ` · via ${monitor.model}` : ""} · “{v.description}”
                </>
              ) : armed ? (
                "waiting for first check…"
              ) : (
                "press Start monitoring to begin"
              )}
            </p>
            {monitor.error && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 font-mono text-xs text-red-bright">
                <WarningCircle size={14} weight="bold" aria-hidden /> {monitor.error}
              </p>
            )}
          </div>

          <StationMap
            location={locationState.status === "set" ? locationState.location : null}
            stations={locationState.status === "set" ? locationState.stations : null}
          />
        </section>

        {/* Right: timeline */}
        <section aria-label="Incident timeline" className="flex min-h-[420px] min-w-0 flex-col rounded-2xl border border-line bg-surface lg:max-h-[calc(100dvh-7rem)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Broadcast size={18} weight="bold" className="text-red-bright" aria-hidden />
              <h1 className="font-display text-lg font-semibold">Incidents</h1>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${openCount ? "bg-red text-white" : "bg-white/10 text-muted"}`}
                aria-label={`${openCount} open`}
              >
                {openCount} open
              </span>
            </div>
            {incidents.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-faint transition-colors hover:bg-white/5 hover:text-fg"
              >
                <Trash size={14} weight="bold" aria-hidden /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {incidents.length === 0 ? (
              <div className="grid h-full min-h-[300px] place-items-center text-center">
                <div className="max-w-xs">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line-strong text-sev-low">
                    <ShieldCheck size={28} weight="bold" aria-hidden />
                  </span>
                  <p className="mt-4 font-semibold">All clear</p>
                  <p className="mt-1 text-sm text-muted">
                    Confirmed incidents appear here, newest first. Use “Send test alert” to check your phone setup.
                  </p>
                </div>
              </div>
            ) : (
              incidents.map((i) => <IncidentCard key={i.id} incident={i} now={now} onAck={acknowledge} onDismiss={dismiss} onAddDispatch={addDispatch} />)
            )}
          </div>

          <p className="border-t border-line px-4 py-3 text-xs text-faint">
            Frames are analyzed and discarded. Only flagged snapshots are kept, in memory.
          </p>
        </section>
      </main>
    </div>
  );
}

function SystemChip({ ok, icon, label }: { ok: boolean | undefined; icon: React.ReactNode; label: string }) {
  const tone = ok === undefined ? "text-faint border-line" : ok ? "text-sev-low border-sev-low/30" : "text-red-bright border-red/40";
  return (
    <span className={`hidden h-9 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] md:inline-flex ${tone}`}>
      {icon}
      {label}
      <span className="sr-only">{ok ? "configured" : "not configured"}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-sev-low" : ok === false ? "bg-red-bright" : "bg-faint"}`} aria-hidden />
    </span>
  );
}

function LocationChip({ state, onLocate }: { state: LocationState; onLocate: () => void }) {
  const set = state.status === "set";
  const label =
    state.status === "set"
      ? state.stations?.ambulance
        ? `Near ${state.stations.ambulance.name}`
        : "Location set"
      : state.status === "locating"
        ? "Locating…"
        : state.status === "error"
          ? "Location blocked"
          : "Set location";
  const title =
    state.status === "error"
      ? `${state.message} Simulated dispatch needs your location.`
      : set
        ? "Camera location is set. Click to update it."
        : "Share your location so incidents dispatch (simulated) to the nearest real station.";
  return (
    <button
      type="button"
      onClick={onLocate}
      disabled={state.status === "locating"}
      title={title}
      className={`inline-flex h-9 max-w-[220px] cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] transition-colors hover:bg-white/5 disabled:cursor-wait ${
        set ? "border-sev-low/30 text-sev-low" : state.status === "error" ? "border-red/40 text-red-bright" : "border-line-strong text-muted"
      }`}
    >
      <MapPin size={14} weight="bold" aria-hidden className="shrink-0" />
      <span className="hidden truncate sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}

function Stat({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-faint">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${hot ? "text-red-bright" : "text-fg"}`}>{value}</p>
    </div>
  );
}
