"use client";

import { useCallback, useEffect, useState } from "react";
import type { Station, UserLocation } from "@/lib/types";

type Stations = { ambulance: Station | null; police: Station | null; fire: Station | null };

export type LocationState =
  | { status: "unknown" }
  | { status: "locating" }
  | { status: "set"; location: UserLocation; stations: Stations | null }
  | { status: "error"; message: string };

/** Shares the browser's location with the server so it can find the nearest stations. */
export function useLocation() {
  const [state, setState] = useState<LocationState>({ status: "unknown" });

  const load = useCallback(async (attempt = 0) => {
    try {
      const res = await fetch("/api/location", { cache: "no-store" });
      const data = (await res.json()) as { location: UserLocation | null; stations: Stations | null };
      if (data.location) setState({ status: "set", location: data.location, stations: data.stations });
      // The server looks stations up in the background; check back until they arrive.
      if (data.location && !data.stations && attempt < 15) setTimeout(() => load(attempt + 1), 3000);
    } catch {
      /* keep current state */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "This browser cannot share location." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        try {
          await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(location),
          });
          setState({ status: "set", location: { ...location, ts: Date.now() }, stations: null });
          void load();
        } catch {
          setState({ status: "error", message: "Could not reach the server." });
        }
      },
      (err) =>
        setState({
          status: "error",
          message: err.code === err.PERMISSION_DENIED ? "Location access is blocked in this browser." : "Could not get your location.",
        }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, [load]);

  return { state, locate };
}
