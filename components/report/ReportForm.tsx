"use client";

import { MapPin, Record as RecordIcon, Stop, UploadSimple, VideoCamera, WarningCircle, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { extractFrames } from "@/lib/videoFrames";

const MAX_RECORD_S = 30;

type Loc = { lat: number; lon: number } | null;

export function ReportForm() {
  const router = useRouter();
  const [video, setVideo] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loc, setLoc] = useState<Loc>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const locate = useCallback(() => {
    setLocError(null);
    if (!navigator.geolocation) return setLocError("This browser cannot share location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => setLocError(err.code === err.PERMISSION_DENIED ? "Location is blocked. Responders will not know where you are." : "Could not get your location."),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  useEffect(() => stopStream, [stopStream]);

  // The live preview element only exists once `recording` is true, so attach the stream after render.
  useEffect(() => {
    if (recording && liveRef.current && streamRef.current) liveRef.current.srcObject = streamRef.current;
  }, [recording]);

  function setPicked(blob: Blob | null) {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return blob ? URL.createObjectURL(blob) : null;
    });
    setVideo(blob);
    setError(null);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        setPicked(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
        stopStream();
        setRecording(false);
      };
      rec.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      stopStream();
      setRecording(false);
      setError("Could not open the camera. Allow camera access, or upload a video instead.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  // Auto-stop at the time limit.
  useEffect(() => {
    if (recording && seconds >= MAX_RECORD_S) stopRecording();
  }, [recording, seconds]);

  async function submit() {
    if (!video) return setError("Add a video first.");
    setBusy(true);
    setError(null);
    try {
      const frames = await extractFrames(video);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, note, location: loc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your report.");
      router.push(`/report/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your report.");
      setBusy(false);
    }
  }

  const btn = "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg px-4 font-semibold disabled:opacity-50";

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
          <Logo />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Report an emergency</h1>
          <p className="mt-2 text-muted">Send a short video. Our AI reviews it, a person confirms, and you see which responders are on the way.</p>
        </div>


        <div className="overflow-hidden rounded-2xl border border-line-strong bg-black">
          {recording ? (
            <div className="relative">
              <video ref={liveRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 font-mono text-xs text-red-bright">
                <span className="h-2 w-2 animate-blink rounded-full bg-red-bright" /> REC 0:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          ) : previewUrl ? (
            <video src={previewUrl} controls playsInline className="aspect-video w-full bg-black object-contain" />
          ) : (
            <div className="grid aspect-video place-items-center p-6 text-center text-faint">
              <div>
                <VideoCamera size={36} weight="bold" className="mx-auto" aria-hidden />
                <p className="mt-2 text-sm">Record a video or upload one</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {recording ? (
            <button type="button" onClick={stopRecording} className={`${btn} bg-red text-white hover:bg-red-bright`}>
              <Stop size={18} weight="fill" aria-hidden /> Stop recording
            </button>
          ) : (
            <>
              <button type="button" onClick={startRecording} disabled={busy} className={`${btn} bg-red text-white hover:bg-red-bright`}>
                <RecordIcon size={18} weight="fill" aria-hidden /> Record video
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={`${btn} border border-line-strong hover:bg-white/5`}>
                <UploadSimple size={18} weight="bold" aria-hidden /> Upload video
              </button>
              {video && (
                <button type="button" onClick={() => setPicked(null)} disabled={busy} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-muted hover:text-fg">
                  <X size={16} weight="bold" aria-hidden /> Remove
                </button>
              )}
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPicked(f);
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <label htmlFor="note" className="text-sm font-medium">
            What is happening? <span className="text-faint">(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Two people fighting outside the entrance, one is bleeding."
            className="mt-1.5 w-full resize-none rounded-lg border border-line-strong bg-surface-2 p-3 text-sm outline-none focus-visible:border-red-bright"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`inline-flex items-center gap-1.5 ${loc ? "text-sev-low" : "text-muted"}`}>
            <MapPin size={16} weight="bold" aria-hidden /> {loc ? "Location shared" : (locError ?? "Getting your location…")}
          </span>
          {!loc && locError && (
            <button type="button" onClick={locate} className="cursor-pointer text-red-bright underline-offset-2 hover:underline">
              Try again
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-bright">
            <WarningCircle size={16} weight="bold" aria-hidden /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy || recording || !video}
          className="h-12 w-full cursor-pointer rounded-lg bg-red font-semibold text-white transition-colors hover:bg-red-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send report"}
        </button>
      </main>
    </div>
  );
}
