"use client";

import { useEffect, useRef, useState } from "react";
import { clusterCameras, clusterIsTight } from "@/lib/cameraClusters";
import { GOOGLE_MAPS_BROWSER_KEY, loadGoogleMaps, type GoogleMapsApi } from "@/lib/googleMaps";
import type { GdotCameraOption } from "@/lib/gdot511";

const KEY = GOOGLE_MAPS_BROWSER_KEY;
const GA = { lat: 32.65, lng: -83.5 };
const CAM = "#e10600";
const INK = "#f5f5f4";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/**
 * Statewide camera map under the responders map. Only paints clusters / pins
 * for the current viewport, never a Marker per camera.
 */
export function CamerasMap({
  cameras,
  activeViewId,
  onSelect,
}: {
  cameras: GdotCameraOption[];
  activeViewId: number;
  onSelect: (cam: GdotCameraOption) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapsApi | null>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const markersRef = useRef<GoogleMapsApi[]>([]);
  const infoRef = useRef<GoogleMapsApi | null>(null);
  const camerasRef = useRef(cameras);
  const activeRef = useRef(activeViewId);
  const onSelectRef = useRef(onSelect);
  const [error, setError] = useState<string | null>(null);

  camerasRef.current = cameras;
  activeRef.current = activeViewId;
  onSelectRef.current = onSelect;

  const drawRef = useRef<() => void>(() => {});
  drawRef.current = () => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;
    const b = map.getBounds?.();
    if (!b) return;

    for (const m of markersRef.current) {
      maps.event.clearInstanceListeners(m);
      m.setMap(null);
    }
    markersRef.current = [];
    infoRef.current?.close();

    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const clusters = clusterCameras(
      camerasRef.current,
      { south: sw.lat(), north: ne.lat(), west: sw.lng(), east: ne.lng() },
      map.getZoom() ?? 7,
    );
    const activeId = activeRef.current;

    const openList = (anchor: GoogleMapsApi, list: GdotCameraOption[]) => {
      const info = infoRef.current;
      if (!info) return;
      info.setContent(
        `<div id="cam-cluster-list" style="max-width:260px;max-height:220px;overflow:auto;font:12px/1.4 system-ui,sans-serif">
          ${list
            .map(
              (c) =>
                `<button type="button" data-view="${c.viewId}" style="display:block;width:100%;text-align:left;padding:7px 2px;border:0;border-bottom:1px solid #eee;background:none;cursor:pointer">${esc(c.location)}</button>`,
            )
            .join("")}
        </div>`,
      );
      info.open({ map, anchor });
      maps.event.addListenerOnce(info, "domready", () => {
        const root = document.getElementById("cam-cluster-list");
        if (!root) return;
        root.onclick = (e) => {
          const btn = (e.target as HTMLElement | null)?.closest("[data-view]");
          if (!btn) return;
          const id = Number(btn.getAttribute("data-view"));
          const cam = camerasRef.current.find((c) => c.viewId === id);
          if (cam) onSelectRef.current(cam);
          info.close();
        };
      });
    };

    const addMarker = (opts: Record<string, unknown>, onClick: () => void) => {
      const marker = new maps.Marker({ map, optimized: true, ...opts });
      marker.addListener("click", onClick);
      markersRef.current.push(marker);
      return marker;
    };

    for (const cluster of clusters) {
      const n = cluster.cameras.length;
      const only = n === 1 ? cluster.cameras[0] : null;
      const isActive = only?.viewId === activeId;
      if (only) {
        addMarker(
          {
            position: { lat: only.lat, lng: only.lon },
            title: only.location,
            zIndex: isActive ? 4 : 2,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: isActive ? 9 : 6,
              fillColor: isActive ? CAM : INK,
              fillOpacity: 1,
              strokeColor: isActive ? INK : CAM,
              strokeWeight: 2,
            },
          },
          () => onSelectRef.current(only),
        );
        continue;
      }

      const marker = addMarker(
        {
          position: { lat: cluster.lat, lng: cluster.lon },
          title: `${n} cameras`,
          zIndex: 1,
          label: { text: String(n), color: INK, fontSize: "11px", fontWeight: "700" },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 11 + Math.min(10, Math.log2(n) * 1.6),
            fillColor: CAM,
            fillOpacity: 0.92,
            strokeColor: INK,
            strokeWeight: 2,
            labelOrigin: new maps.Point(0, 0),
          },
        },
        () => {
          if (clusterIsTight(cluster) || (map.getZoom() ?? 0) >= 16) {
            openList(marker, cluster.cameras);
            return;
          }
          const bounds = new maps.LatLngBounds();
          for (const c of cluster.cameras) bounds.extend({ lat: c.lat, lng: c.lon });
          map.fitBounds(bounds, 72);
        },
      );
    }

    const active = camerasRef.current.find((c) => c.viewId === activeId);
    if (active && clusters.every((cl) => cl.cameras.length !== 1 || cl.cameras[0].viewId !== activeId)) {
      const pos = { lat: active.lat, lng: active.lon };
      if (b.contains(pos)) {
        addMarker(
          {
            position: pos,
            title: active.location,
            zIndex: 5,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: CAM,
              fillOpacity: 1,
              strokeColor: INK,
              strokeWeight: 2,
            },
          },
          () => onSelectRef.current(active),
        );
      }
    }
  };

  useEffect(() => {
    if (!KEY || !el.current || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || mapRef.current || !el.current) return;
        const map = new maps.Map(el.current, {
          center: GA,
          zoom: 7,
          minZoom: 6,
          maxZoom: 18,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          colorScheme: "DARK",
        });
        mapsRef.current = maps;
        mapRef.current = map;
        infoRef.current = new maps.InfoWindow();
        map.addListener("idle", () => drawRef.current());
        drawRef.current();
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    drawRef.current();
  }, [cameras, activeViewId]);

  return (
    <section aria-label="All traffic cameras map" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">All cameras</h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {cameras.length
            ? `${cameras.length.toLocaleString()} statewide · click a pin to watch`
            : "Loading camera locations…"}
        </p>
      </div>
      {!KEY ? (
        <p className="p-4 text-sm text-muted">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to show the map.</p>
      ) : error ? (
        <p role="alert" className="p-4 text-sm text-red-bright">
          {error}
        </p>
      ) : (
        <div ref={el} className="h-96 w-full" />
      )}
    </section>
  );
}
