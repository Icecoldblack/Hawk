"use client";

import { Ambulance, FireTruck, MapPin, Phone, PoliceCar, WarningCircle } from "@phosphor-icons/react";
import { SERVICE_LABELS, type Dispatch, type ServiceType } from "@/lib/types";

const ICONS: Record<ServiceType, typeof Ambulance> = { ambulance: Ambulance, police: PoliceCar, fire: FireTruck };

function countdown(dispatch: Dispatch, now: number) {
  if (!dispatch.station || !now) return null;
  const left = Math.round((dispatch.ts + dispatch.station.etaMin * 60_000 - now) / 1000);
  if (left <= 0) return "on scene (simulated)";
  return `arriving in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

export function DispatchPanel({ dispatch, now }: { dispatch: Dispatch | undefined; now: number }) {
  if (!dispatch) {
    return <p className="px-3 pb-3 font-mono text-[11px] text-faint">Finding nearest responder…</p>;
  }
  const Icon = ICONS[dispatch.service];
  const s = dispatch.station;

  return (
    <div className="mx-3 mb-3 rounded-lg border border-line bg-bg/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Icon size={16} weight="fill" className="text-red-bright" aria-hidden />
          {SERVICE_LABELS[dispatch.service]}
        </span>
        <span className="rounded bg-sev-mid/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sev-mid">
          Simulated · not contacted
        </span>
      </div>

      {dispatch.status === "notified" && s ? (
        <>
          <p className="mt-1.5 text-sm font-medium leading-snug">{s.name}</p>
          {s.address && <p className="text-xs text-muted">{s.address}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
            <span>{s.distanceKm} km</span>
            <span>ETA ~{s.etaMin} min</span>
            <span className="text-fg">{countdown(dispatch, now)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a href={s.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-bright underline-offset-2 hover:underline">
              <MapPin size={13} weight="bold" aria-hidden /> View on map
            </a>
            {s.phone && (
              <span className="inline-flex items-center gap-1 text-faint">
                <Phone size={13} weight="bold" aria-hidden /> {s.phone}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <WarningCircle size={14} weight="bold" className={dispatch.status === "searching" ? "animate-blink text-muted" : "text-sev-mid"} aria-hidden />
          {dispatch.status === "searching"
            ? "Finding the nearest station…"
            : dispatch.status === "no_location"
            ? "Camera location not set. Use the Location button at the top to enable dispatch."
            : dispatch.status === "not_found"
              ? "No station of this type found within 50 km."
              : "Station lookup failed. Check the server's internet connection."}
        </p>
      )}
    </div>
  );
}
