import { EVENT_LABELS, SERVICE_LABELS, type Incident } from "./types";

function dispatchLine({ dispatch }: Incident): string {
  if (!dispatch) return "";
  const service = SERVICE_LABELS[dispatch.service];
  const s = dispatch.station;
  if (dispatch.status === "notified" && s) {
    return `${service} → [${s.name}](${s.mapUrl}), ${s.distanceKm} km away, ETA ~${s.etaMin} min`;
  }
  if (dispatch.status === "searching") return `${service}: finding the nearest station (see dashboard)`;
  if (dispatch.status === "no_location") return `${service}: camera location not set`;
  if (dispatch.status === "not_found") return `${service}: no station found nearby`;
  return `${service}: lookup failed`;
}

const SEVERITY_COLORS = { low: 0x22c55e, mid: 0xf59e0b, high: 0xe10600 };

function severityColor(severity: number) {
  if (severity >= 4) return SEVERITY_COLORS.high;
  if (severity === 3) return SEVERITY_COLORS.mid;
  return SEVERITY_COLORS.low;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return new Blob([Buffer.from(match[2], "base64")], { type: match[1] });
}

/** Post the incident to Discord with the snapshot attached. Returns true on success. */
export async function sendDiscordAlert(incident: Incident): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;

  const label = EVENT_LABELS[incident.eventType].toUpperCase();
  const image = dataUrlToBlob(incident.snapshot);
  const payload = {
    content: `🚨 ALERT: ${label} (severity ${incident.severity}/5)${incident.test ? " [TEST]" : ""}`,
    embeds: [
      {
        title: `${label} detected on ${incident.cameraId}`,
        description: incident.description,
        color: severityColor(incident.severity),
        fields: [
          { name: "Severity", value: `${incident.severity}/5`, inline: true },
          { name: "Confidence", value: `${Math.round(incident.confidence * 100)}%`, inline: true },
          ...(incident.dispatch ? [{ name: "Dispatch (SIMULATED, nobody was contacted)", value: dispatchLine(incident) }] : []),
        ],
        image: image ? { url: "attachment://snapshot.jpg" } : undefined,
        footer: { text: `Hawk ·${new Date(incident.ts).toLocaleTimeString()}` },
      },
    ],
  };

  try {
    let res: Response;
    if (image) {
      const form = new FormData();
      form.append("payload_json", JSON.stringify(payload));
      form.append("files[0]", image, "snapshot.jpg");
      res = await fetch(url, { method: "POST", body: form });
    } else {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) console.error("Discord alert failed:", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("Discord alert error:", err);
    return false;
  }
}
