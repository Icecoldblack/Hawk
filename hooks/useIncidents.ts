"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Incident, ServiceType } from "@/lib/types";

const POLL_MS = 2000;

/** Polls /api/incidents every 2s and reports newly arrived incidents. */
export function useIncidents(onNew?: (incident: Incident) => void) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { incidents: Incident[] };
      // First load seeds the seen set so old incidents don't ring the alarm.
      if (seen.current) {
        for (const i of data.incidents) if (!seen.current.has(i.id)) onNewRef.current?.(i);
      }
      seen.current = new Set(data.incidents.map((i) => i.id));
      setIncidents(data.incidents);
      setError(null);
    } catch {
      setError("Lost connection to the server. Retrying…");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const acknowledge = useCallback(
    async (id: string) => {
      setIncidents((list) => list.map((i) => (i.id === id ? { ...i, status: "acknowledged" } : i)));
      try {
        const res = await fetch(`/api/incidents/${id}/ack`, { method: "POST" });
        if (!res.ok) throw new Error();
      } catch {
        setError("Could not acknowledge. Check the connection.");
        void refresh();
      }
    },
    [refresh],
  );

  const dismiss = useCallback(
    async (id: string) => {
      setIncidents((list) => list.map((i) => (i.id === id ? { ...i, status: "dismissed" } : i)));
      try {
        const res = await fetch(`/api/incidents/${id}/dismiss`, { method: "POST" });
        if (!res.ok) throw new Error();
      } catch {
        setError("Could not dismiss. Check the connection.");
        void refresh();
      }
    },
    [refresh],
  );

  const addDispatch = useCallback(
    async (id: string, service: ServiceType) => {
      try {
        const res = await fetch(`/api/incidents/${id}/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service }),
        });
        if (!res.ok && res.status !== 409) throw new Error();
      } catch {
        setError("Could not add responder. Check the connection.");
      }
      void refresh();
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    await fetch("/api/incidents", { method: "DELETE" }).catch(() => null);
    seen.current = new Set();
    void refresh();
  }, [refresh]);

  return { incidents, error, loaded, acknowledge, dismiss, addDispatch, clearAll, refresh };
}
