"use client";

import { Check, CheckCircle, DiscordLogo } from "@phosphor-icons/react";
import { EventIcon, severityTone } from "@/components/EventIcon";
import { EVENT_LABELS, type Incident } from "@/lib/types";
import { DispatchPanel } from "./DispatchPanel";

function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export function IncidentCard({ incident, now, onAck }: { incident: Incident; now: number; onAck: (id: string) => void }) {
  const open = incident.status === "open";
  const tone = severityTone(incident.severity);

  return (
    <article
      className={`animate-rise overflow-hidden rounded-xl border bg-surface-2 transition-colors ${
        open ? "animate-pulse-border border-red" : "border-line opacity-80"
      }`}
      aria-label={`${EVENT_LABELS[incident.eventType]} incident, severity ${incident.severity} of 5, ${open ? "open" : "acknowledged"}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-3">
          {incident.snapshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={incident.snapshot} alt={`Snapshot of ${EVENT_LABELS[incident.eventType]} incident`} className="h-full w-full object-cover" />
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
              {EVENT_LABELS[incident.eventType]}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${tone.text} ${tone.ring}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tone.bg}`} aria-hidden />
              {tone.label} {incident.severity}/5
            </span>
            {incident.test && <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">Test</span>}
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-fg">{incident.description}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-faint">
            <time dateTime={new Date(incident.ts).toISOString()}>{new Date(incident.ts).toLocaleTimeString()}</time>
            <span>· {timeAgo(incident.ts, now)}</span>
            <span>· {Math.round(incident.confidence * 100)}% conf</span>
            <span className={`inline-flex items-center gap-1 ${incident.alerted ? "text-[#8b9bff]" : ""}`}>
              · <DiscordLogo size={12} weight="fill" aria-hidden /> {incident.alerted ? "sent" : "not sent"}
            </span>
          </p>
        </div>
      </div>

      <DispatchPanel dispatch={incident.dispatch} now={now} />

      <div className="border-t border-line px-3 py-2">
        {open ? (
          <button
            type="button"
            onClick={() => onAck(incident.id)}
            className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-red text-sm font-semibold text-white transition-colors hover:bg-red-bright active:scale-[0.99]"
          >
            <Check size={16} weight="bold" aria-hidden />
            Acknowledge
          </button>
        ) : (
          <p className="flex h-9 items-center justify-center gap-2 text-sm font-medium text-sev-low">
            <CheckCircle size={16} weight="fill" aria-hidden />
            Acknowledged
          </p>
        )}
      </div>
    </article>
  );
}
