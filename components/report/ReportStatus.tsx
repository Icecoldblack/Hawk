"use client";

import { Ambulance, CheckCircle, Circle, FireTruck, PoliceCar, SpinnerGap } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import type { ServiceType } from "@/lib/types";

type Responder = { service: ServiceType; label: string; station: string | null; etaMin: number | null; arrivesAt: number | null };
type Report = { stage: "reviewing" | "dispatched" | "dismissed"; submittedAt: number; confirmedAt: number | null; responders: Responder[] };

const ICONS: Record<ServiceType, typeof Ambulance> = { ambulance: Ambulance, police: PoliceCar, fire: FireTruck };

function countdown(arrivesAt: number | null, now: number) {
  if (!arrivesAt || !now) return null;
  const left = Math.round((arrivesAt - now) / 1000);
  if (left <= 0) return "Arriving now";
  return `Arriving in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

export function ReportStatus({ id }: { id: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [missing, setMissing] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/reports/${id}`, { cache: "no-store" });
        if (!alive) return;
        if (res.status === 404) return setMissing(true);
        if (res.ok) setReport(await res.json());
      } catch {
        /* keep the last status and try again */
      }
    }
    void load();
    const poll = setInterval(load, 2000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [id]);

  const stage = report?.stage;
  const steps = [
    { label: "Report received", done: !!report },
    { label: "AI reviewed your video", done: !!report },
    { label: "A person is confirming", done: stage === "dispatched" || stage === "dismissed", active: stage === "reviewing" },
    { label: "Responders on the way", done: stage === "dispatched" },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
          <Logo />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        {missing ? (
          <div className="rounded-2xl border border-line-strong bg-surface p-6">
            <h1 className="font-display text-2xl font-bold">Report not found</h1>
            <p className="mt-2 text-muted">It may have been cleared, or the server restarted.</p>
            <Link href="/report" className="mt-4 inline-block text-red-bright underline-offset-2 hover:underline">
              File a new report
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {stage === "dispatched" ? "Help is on the way" : stage === "dismissed" ? "Report reviewed" : "We got your report"}
            </h1>


            <ol className="space-y-3 rounded-2xl border border-line bg-surface p-5">
              {steps.map((s) => (
                <li key={s.label} className={`flex items-center gap-3 text-sm ${s.done ? "text-fg" : s.active ? "text-fg" : "text-faint"}`}>
                  {s.done ? (
                    <CheckCircle size={20} weight="fill" className="text-sev-low" aria-hidden />
                  ) : s.active ? (
                    <SpinnerGap size={20} weight="bold" className="animate-spin text-red-bright" aria-hidden />
                  ) : (
                    <Circle size={20} weight="bold" aria-hidden />
                  )}
                  {s.label}
                </li>
              ))}
            </ol>

            {stage === "dispatched" && (
              <div className="space-y-3">
                {report!.responders.length === 0 && <p className="text-muted">Responders have been alerted. We could not find a nearby station to show an arrival time.</p>}
                {report!.responders.map((r) => {
                  const Icon = ICONS[r.service];
                  const left = countdown(r.arrivesAt, now);
                  return (
                    <div key={r.service} className="flex items-center gap-4 rounded-2xl border border-red/40 bg-red/10 p-4">
                      <Icon size={32} weight="fill" className="shrink-0 text-red-bright" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{r.label} on the way</p>
                        {r.station && <p className="truncate text-sm text-muted">From {r.station}</p>}
                      </div>
                      {r.etaMin != null && (
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold tabular-nums">{left}</p>
                          <p className="font-mono text-[11px] text-muted">ETA ~{r.etaMin} min</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {stage === "dismissed" && (
              <p className="rounded-2xl border border-line-strong bg-surface p-5 text-muted">
                A reviewer did not find an emergency in your report, so no responders were sent. If someone is in danger, call your local emergency number.
              </p>
            )}

            {stage === "reviewing" && <p className="text-sm text-muted">Keep this page open. It updates on its own as soon as a person confirms.</p>}
          </>
        )}
      </main>
    </div>
  );
}
