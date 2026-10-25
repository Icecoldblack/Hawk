"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_BROWSER_KEY, loadGoogleMaps, type GoogleMapsApi } from "@/lib/googleMaps";
import type { Station, UserLocation } from "@/lib/types";

type Stations = { ambulance: Station | null; police: Station | null; fire: Station | null };

const KEY = GOOGLE_MAPS_BROWSER_KEY;
const COLORS = { ambulance: "#ef4444", police: "#3b82f6", fire: "#f59e0b" } as const;
const LABELS = { ambulance: "Hospital / EMS", police: "Police", fire: "Fire" } as const;

/**
 * Nearest-responders map that follows the ACTIVE traffic camera: keeps one map
 * instance alive and pans to wherever the current camera's coordinates are.
 */
export function RespondersMap({ location, stations }: { location: UserLocation | null; stations: Stations | null }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapsApi | null>(null);
  const camMarker = useRef<GoogleMapsApi | null>(null);
  const stationMarkers = useRef<GoogleMapsApi[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create the map once the div exists and we have a location.
  useEffect(() => {
    if (!KEY || !el.current || !location || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || mapRef.current) return;
        const center = { lat: location.lat, lng: location.lon };
        const map = new maps.Map(el.current, {
          center,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          colorScheme: "DARK",
        });
        mapRef.current = map;
        camMarker.current = new maps.Marker({
          map,
          position: center,
          title: "Active camera",
          icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#ffffff", fillOpacity: 1, strokeColor: "#e10600", strokeWeight: 3 },
        });
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [location]);

  // Follow the active camera: pan the map and move the camera marker.
  useEffect(() => {
    if (!mapRef.current || !location) return;
    const pos = { lat: location.lat, lng: location.lon };
    mapRef.current.panTo(pos);
    camMarker.current?.setPosition(pos);
  }, [location]);

  // Redraw responder stations when the lookup lands (or the camera moves).
  useEffect(() => {
    if (!mapRef.current || !location) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maps = (window as any).google.maps;
    stationMarkers.current.forEach((m) => m.setMap(null));
    stationMarkers.current = [];
    if (!stations) return;

    const bounds = new maps.LatLngBounds();
    bounds.extend({ lat: location.lat, lng: location.lon });
    for (const kind of ["ambulance", "police", "fire"] as const) {
      const s = stations[kind];
      if (!s) continue;
      const position = { lat: s.lat, lng: s.lon };
      bounds.extend(position);
      const marker = new maps.Marker({
        map: mapRef.current,
        position,
        title: `${LABELS[kind]}: ${s.name}`,
        icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: COLORS[kind], fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
      const info = new maps.InfoWindow({ content: `<strong>${LABELS[kind]}</strong><br>${s.name.replace(/</g, "&lt;")}<br>${s.distanceKm} km` });
      marker.addListener("click", () => info.open({ map: mapRef.current, anchor: marker }));
      stationMarkers.current.push(marker);
    }
    mapRef.current.fitBounds(bounds, 48);
  }, [location, stations]);

  return (
    <section aria-label="Nearby responders map" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">Nearest responders</h2>
        <div className="flex gap-3 font-mono text-[10px] uppercase tracking-wider text-muted">
          {(Object.keys(COLORS) as (keyof typeof COLORS)[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[k] }} /> {LABELS[k]}
            </span>
          ))}
        </div>
      </div>
      {!KEY ? (
        <p className="p-4 text-sm text-muted">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to show the map.</p>
      ) : !location ? (
        <p className="p-4 text-sm text-muted">Pinning active camera location…</p>
      ) : error ? (
        <p role="alert" className="p-4 text-sm text-red-bright">{error}</p>
      ) : (
        <div ref={el} className="h-72 w-full" />
      )}
    </section>
  );
}
