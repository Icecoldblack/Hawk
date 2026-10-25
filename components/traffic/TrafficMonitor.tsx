"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Brain,
  Broadcast,
  MagnifyingGlass,
  MapPin,
  PaperPlaneTilt,
  Play,
  ShieldCheck,
  Stop,
  Trash,
  VideoCameraSlash,
  WarningCircle,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { IncidentCard } from "@/components/monitor/IncidentCard";
import { CamerasMap } from "./CamerasMap";
import { RespondersMap } from "./RespondersMap";
import { StatusPill, type MonitorStatus } from "@/components/monitor/StatusPill";
import { useIncidents } from "@/hooks/useIncidents";
import { useMonitor } from "@/hooks/useMonitor";
import { playAlarm, unlockAudio } from "@/lib/sound";
import { distanceKm, type GdotCameraOption } from "@/lib/gdot511";
import type { AppConfig, Station, UserLocation } from "@/lib/types";

// Default: GDOT-0008, I-75/I-85 N at I-20 — busy downtown connector, constant traffic.
const DEFAULT_VIEW_ID = 20321;
const DEFAULT_CAMERA: GdotCameraOption = {
  viewId: DEFAULT_VIEW_ID,
  name: "gdot-cctv-0008",
  roadway: "I-75/I-85",
  direction: "Northbound",
  location: "GDOT-0008: I-75/I-85 N at I-20 MM 246.3 (Fulton)",
  area: "Atlanta",
  lat: 33.745889,
  lon: -84.38837,
};

const MAX_RESULTS = 30;

// The GDOT token on the .m3u8 URL lives ~2min; re-resolve well before it dies.
const TOKEN_REFRESH_MS = 80_000;
const RETRY_MS = 8_000;

type Stations = { ambulance: Station | null; police: Station | null; fire: Station | null };

export function TrafficMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [armed, setArmed] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [now, setNow] = useState(0);
  const [testing, setTesting] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stations, setStations] = useState<Stations | null>(null);
  const [cameras, setCameras] = useState<GdotCameraOption[]>([]);
  const [camera, setCamera] = useState<GdotCameraOption>(DEFAULT_CAMERA);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [areaFilter, setAreaFilter] = useState("");
  const [geo, setGeo] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const geoCache = useRef(new Map<string, { label: string; lat: number; lng: number } | null>());

  const onNewIncident = useCallback(() => {
    playAlarm();
    setFlashKey((k) => k + 1);
  }, []);

  const { incidents, error: pollError, acknowledge, dismiss, addDispatch, clearAll, refresh } = useIncidents(onNewIncident);
  const monitor = useMonitor(videoRef, {
    enabled: armed && playing,
    cameraId: camera.name,
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
    document.title = openCount > 0 ? `ALERT (${openCount}) · Hawk` : "GDOT traffic cam · Hawk";
  }, [openCount]);

  // Load the trimmed camera list once for the picker.
  useEffect(() => {
    fetch("/api/gdot511/cameras")
      .then((r) => r.json())
      .then((d: { cameras?: GdotCameraOption[] }) => {
        if (d.cameras?.length) {
          setCameras(d.cameras);
          // Prefer the live record for the default camera if the list has it.
          const match = d.cameras.find((c) => c.viewId === DEFAULT_VIEW_ID);
          if (match) setCamera((cur) => (cur.viewId === DEFAULT_VIEW_ID ? match : cur));
        }
      })
      .catch(() => null);
  }, []);

  // Attach the GDOT HLS stream. Tokens expire ~2min, so re-resolve the URL on a
  // timer and whenever hls.js hits a fatal error (usually that same expiry).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const viewId = camera.viewId;
    setPlaying(false);
    setStreamError(null);
    let destroyed = false;
    let hls: Hls | null = null;
    let timer: number | undefined;
    const native = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    async function load() {
      try {
        const res = await fetch(`/api/gdot511/video/${viewId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { url } = (await res.json()) as { url: string };
        if (destroyed || !video) return;
        setStreamError(null);
        // Route through our HLS proxy: GDOT stream hosts have inconsistent CORS
        // headers, and same-origin media keeps canvas frame-grabs untainted.
        const proxied = `/api/gdot511/hls?u=${encodeURIComponent(url)}`;
        if (native) {
          if (video.src !== new URL(proxied, window.location.origin).href) {
            video.src = proxied;
            void video.play().catch(() => null);
          }
        } else {
          if (!hls) {
            // GDOT's streaming host is slow — default hls.js timeouts (10s) can
            // fire before it responds, so give everything more headroom.
            hls = new Hls({
              enableWorker: true,
              manifestLoadingTimeOut: 30000,
              levelLoadingTimeOut: 30000,
              fragLoadingTimeOut: 30000,
              manifestLoadingMaxRetry: 6,
              levelLoadingMaxRetry: 6,
              fragLoadingMaxRetry: 6,
            });
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => void video.play().catch(() => null));
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (!data.fatal) return;
              setStreamError(`Stream error: ${data.details}. Reconnecting…`);
              hls?.destroy();
              hls = null;
              timer = window.setTimeout(load, RETRY_MS);
            });
          }
          hls.loadSource(proxied);
        }
        timer = window.setTimeout(load, TOKEN_REFRESH_MS);
      } catch {
        if (!destroyed) {
          setStreamError("Could not reach the GDOT stream. Retrying…");
          timer = window.setTimeout(load, RETRY_MS);
        }
      }
    }

    void load();
    return () => {
      destroyed = true;
      window.clearTimeout(timer);
      hls?.destroy();
    };
  }, [camera.viewId]);

  // Point dispatch at the camera's real fixed location instead of the browser's.
  const pinGen = useRef(0);
  const pinCameraLocation = useCallback(async () => {
    const gen = ++pinGen.current;
    setStations(null);
    await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: camera.lat, lon: camera.lon }),
    }).catch(() => null);
    if (gen !== pinGen.current) return; // a newer camera took over
    setLocation({ lat: camera.lat, lon: camera.lon, accuracy: null, ts: Date.now() });
    for (let i = 0; i < 15; i++) {
      const res = await fetch("/api/location", { cache: "no-store" }).catch(() => null);
      const data = (await res?.json().catch(() => null)) as { stations: Stations | null } | null;
      if (gen !== pinGen.current) return;
      if (data?.stations) {
        setStations(data.stations);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }, [camera.lat, camera.lon]);

  useEffect(() => {
    void pinCameraLocation();
  }, [pinCameraLocation]);

  function toggleArmed() {
    unlockAudio();
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
      body: JSON.stringify({ snapshot, cameraId: camera.name }),
    }).catch(() => null);
    await refresh();
    setTesting(false);
  }

  const status: MonitorStatus = openCount > 0 ? "alert" : !armed ? "standby" : monitor.motion ? "motion" : "monitoring";
  const threshold = config?.motionThreshold ?? 8;
  const meter = Math.min(100, (monitor.motionScore / (threshold * 3)) * 100);
  const v = monitor.lastVerdict;

  // Geocode the query as a street address (debounced, cached) — "123 Peachtree St",
  // "I-75 & North Ave", landmarks — and list the cameras closest to it.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 6) {
      setGeo(null);
      return;
    }
    const key = q.toLowerCase();
    if (geoCache.current.has(key)) {
      setGeo(geoCache.current.get(key) ?? null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const d = (await r.json()) as { result?: { label: string; lat: number; lng: number } | null };
        const g = d.result ?? null;
        geoCache.current.set(key, g);
        setGeo(g);
      } catch {
        /* keep previous */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [query]);

  const areas = [...new Set(cameras.map((c) => c.area).filter(Boolean))].sort();
  const pool = areaFilter ? cameras.filter((c) => c.area === areaFilter) : cameras;

  // Cameras nearest the geocoded address, distance-sorted.
  const nearby = geo
    ? pool
        .map((c) => ({ cam: c, dist: distanceKm(geo.lat, geo.lng, c.lat, c.lon) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 10)
    : [];

  // Every word must match somewhere: "i-75 edgewood", "savannah", "fulton i-285"…
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = (tokens.length
    ? pool.filter((c) => {
        const hay = `${c.location} ${c.area} ${c.roadway} ${c.direction} ${c.name}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
    : pool
  ).slice(0, MAX_RESULTS);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-line-strong sm:block" />
            <span className="hidden font-mono text-xs uppercase tracking-widest text-faint sm:block">GDOT 511 live camera</span>
          </div>
          <div className="flex items-center gap-2">
            <SystemChip ok={config?.visionConfigured} icon={<Brain size={14} weight="bold" />} label="Vision" />
            <span
              className={`inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[11px] ${
                location ? "border-sev-low/30 text-sev-low" : "border-line-strong text-muted"
              }`}
              title="Dispatch uses the camera's fixed GDOT coordinates"
            >
              <MapPin size={14} weight="bold" aria-hidden className="shrink-0" />
              <span className="hidden truncate sm:inline">{location ? "Camera coords set" : "Pinning camera…"}</span>
            </span>
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
        <section ref={feedRef} aria-label="Camera feed" className="flex min-w-0 scroll-mt-16 flex-col gap-4">
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
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                aria-label="Filter by area"
                className="h-10 cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface-2 px-3 font-mono text-xs text-muted outline-none transition-colors hover:border-white/30 focus-visible:border-red-bright"
              >
                <option value="">All areas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="relative">
                <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPickerOpen(true);
                  }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder={`Address, road or place — ${cameras.length ? cameras.length.toLocaleString() : "…"} cams`}
                  aria-label="Search GDOT cameras"
                  className="h-10 w-64 rounded-lg border border-line-strong bg-surface-2 pl-9 pr-3 font-mono text-xs outline-none transition-colors placeholder:text-faint hover:border-white/30 focus-visible:border-red-bright sm:w-80"
                />
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10 cursor-default" onClick={() => setPickerOpen(false)} aria-hidden />
                    <ul className="absolute right-0 z-20 mt-1 max-h-96 w-[28rem] max-w-[90vw] overflow-auto rounded-xl border border-line-strong bg-surface-2 py-1 shadow-2xl">
                      {nearby.length > 0 && (
                        <>
                          <li className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-red-bright">
                            Nearest to {geo!.label}
                          </li>
                          {nearby.map(({ cam: c, dist }) => (
                            <li key={`near-${c.viewId}`}>
                              <CamRow
                                cam={c}
                                active={c.viewId === camera.viewId}
                                suffix={`${dist.toFixed(1)} km`}
                                onPick={() => {
                                  setCamera(c);
                                  setQuery("");
                                  setPickerOpen(false);
                                }}
                              />
                            </li>
                          ))}
                          {results.length > 0 && <li className="my-1 border-t border-line" aria-hidden />}
                        </>
                      )}
                      {results.length === 0 && nearby.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-muted">
                          {cameras.length ? "No cameras match — try a street address to find the nearest." : "Loading camera list…"}
                        </li>
                      ) : (
                        <>
                          {nearby.length > 0 && results.length > 0 && (
                            <li className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">Matching text</li>
                          )}
                          {results.map((c) => (
                            <li key={c.viewId}>
                              <CamRow
                                cam={c}
                                active={c.viewId === camera.viewId}
                                onPick={() => {
                                  setCamera(c);
                                  setQuery("");
                                  setPickerOpen(false);
                                }}
                              />
                            </li>
                          ))}
                        </>
                      )}
                      <li className="border-t border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                        {geo
                          ? `${nearby.length} nearest + ${results.length}${results.length === MAX_RESULTS ? "+" : ""} text matches`
                          : query
                            ? `${results.length}${results.length === MAX_RESULTS ? "+" : ""} matches`
                            : `${cameras.length.toLocaleString()} cameras — type an address or road`}
                      </li>
                    </ul>
                  </>
                )}
              </div>
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
            {/* crossOrigin lets the motion gate draw CORS-clean frames from the GDOT CDN */}
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              muted
              playsInline
              autoPlay
              crossOrigin="anonymous"
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />

            <div className="pointer-events-none absolute inset-0">
              {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "left-4 bottom-4 border-l-2 border-b-2", "right-4 bottom-4 border-r-2 border-b-2"].map((c) => (
                <span key={c} className={`absolute h-6 w-6 border-white/40 ${c}`} />
              ))}
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-white/80">
                <span className={`h-2 w-2 rounded-full ${armed && playing ? "bg-red-bright animate-blink" : "bg-faint"}`} />
                <span className="max-w-[320px] truncate">{camera.location}</span>
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
                  {streamError ? (
                    <>
                      <VideoCameraSlash size={40} weight="bold" className="mx-auto text-red-bright" aria-hidden />
                      <p className="mt-3 font-medium">{streamError}</p>
                    </>
                  ) : (
                    <p className="font-mono text-sm uppercase tracking-widest text-muted">Connecting to GDOT stream…</p>
                  )}
                </div>
              </div>
            )}
          </div>

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
                  {monitor.model && monitor.model !== config?.model ? " · via fallback" : ""} · “{v.description}”
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

          <RespondersMap location={location} stations={stations} />
          <CamerasMap
            cameras={cameras}
            activeViewId={camera.viewId}
            onSelect={(c) => {
              setCamera(c);
              setPickerOpen(false);
              feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </section>

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
                    Confirmed incidents appear here, newest first. Use “Send test alert” to try it out.
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

function CamRow({ cam, active, suffix, onPick }: { cam: GdotCameraOption; active: boolean; suffix?: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5 ${active ? "bg-red/10" : ""}`}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-xs font-medium text-fg">{cam.location}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          {cam.area ? `${cam.area} · ` : ""}
          {cam.roadway} · {cam.direction}
        </span>
      </span>
      {suffix && <span className="shrink-0 font-mono text-[10px] tabular-nums text-red-bright">{suffix}</span>}
    </button>
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

function Stat({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-faint">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${hot ? "text-red-bright" : "text-fg"}`}>{value}</p>
    </div>
  );
}
