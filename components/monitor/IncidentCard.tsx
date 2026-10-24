"use client";

import { Check, CheckCircle, Plus, X } from "@phosphor-icons/react";
import { EventIcon, severityTone } from "@/components/EventIcon";
import { SERVICE_LABELS, incidentLabel, type Incident, type ServiceType } from "@/lib/types";
import { DispatchPanel } from "./DispatchPanel";

function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

const ALL_SERVICES: ServiceType[] = ["ambulance", "police", "fire"];

export function IncidentCard({
  incident,
  now,
  onAck,
  onDismiss,
  onAddDispatch,
}: {
  incident: Incident;
  now: number;
  onAck: (id: string) => void;
  onDismiss: (id: string) => void;
  onAddDispatch: (id: string, service: ServiceType) => void;
}) {
  const open = incident.status === "open";
  const tone = severityTone(incident.severity);
  const sent = new Set([incident.dispatch?.service, ...(incident.extraDispatches ?? []).map((d) => d.service)]);
  const addable = ALL_SERVICES.filter((s) => !sent.has(s));

  return (
    <article
      className={`animate-rise overflow-hidden rounded-xl border bg-surface-2 transition-colors ${
        open ? "animate-pulse-border border-red" : "border-line opacity-80"
      }`}
      aria-label={`${incidentLabel(incident)} incident, severity ${incident.severity} of 5, ${open ? "open" : "acknowledged"}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-3">
          {incident.snapshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={incident.snapshot} alt={`Snapshot of ${incidentLabel(incident)} incident`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-faint">
              <EventIcon type={incident.eventType} size={28} />
            </div>
          )}
          {open && <span className="absolute left-1.5 top-1.5 rounded bg-red px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">Open</span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-bright">
              <EventIcon type={incident.eventType} size={14} />
              {incidentLabel(incident)}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${tone.text} ${tone.ring}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tone.bg}`} aria-hidden />
              {tone.label} {incident.severity}/5
            </span>
            {incident.source === "report" && <span className="rounded-md bg-[#8b9bff]/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#8b9bff]">Citizen report</span>}
            {incident.test && <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">Test</span>}
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-fg">{incident.description}</p>
          {incident.reporterNote && <p className="mt-1 line-clamp-3 text-xs italic leading-snug text-muted">Reporter: &ldquo;{incident.reporterNote}&rdquo;</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-faint">
            <time dateTime={new Date(incident.ts).toISOString()}>{new Date(incident.ts).toLocaleTimeString()}</time>
            <span>· {timeAgo(incident.ts, now)}</span>
            <span>· {Math.round(incident.confidence * 100)}% conf</span>
          </p>
        </div>
      </div>

      <DispatchPanel dispatch={incident.dispatch} now={now} />
      {incident.extraDispatches?.map((d) => <DispatchPanel key={d.service} dispatch={d} now={now} />)}
      {open && addable.length > 0 && (
        <div className="mx-3 mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Also send</span>
          {addable.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAddDispatch(incident.id, s)}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-line-strong px-2 text-xs font-medium transition-colors hover:bg-white/5"
            >
              <Plus size={12} weight="bold" aria-hidden /> {SERVICE_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-line px-3 py-2">
        {open ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAck(incident.id)}
              className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red text-sm font-semibold text-white transition-colors hover:bg-red-bright active:scale-[0.99]"
            >
              <Check size={16} weight="bold" aria-hidden />
              {incident.source === "report" ? "Confirm & send responders" : "Acknowledge"}
            </button>
            {incident.source === "report" && (
              <button
                type="button"
                onClick={() => onDismiss(incident.id)}
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium transition-colors hover:bg-white/5"
              >
                <X size={14} weight="bold" aria-hidden />
                False alarm
              </button>
            )}
          </div>
        ) : incident.status === "dismissed" ? (
          <p className="flex h-9 items-center justify-center gap-2 text-sm font-medium text-muted">
            <X size={16} weight="bold" aria-hidden />
            Dismissed as a false alarm
          </p>
        ) : (
          <p className="flex h-9 items-center justify-center gap-2 text-sm font-medium text-sev-low">
            <CheckCircle size={16} weight="fill" aria-hidden />
            {incident.source === "report" ? "Confirmed, responders sent" : "Acknowledged"}
          </p>
        )}
      </div>
    </article>
  );
}
