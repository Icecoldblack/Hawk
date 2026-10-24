import { Fire, HandFist, PersonArmsSpread, PersonSimple, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { EventType } from "@/lib/types";

export function EventIcon({ type, size = 20, className }: { type: EventType; size?: number; className?: string }) {
  const props = { size, weight: "bold" as const, className, "aria-hidden": true };
  switch (type) {
    case "fall":
      return <PersonArmsSpread {...props} style={{ transform: "rotate(-38deg)" }} />;
    case "fight":
      return <HandFist {...props} />;
    case "fire_smoke":
      return <Fire {...props} />;
    case "person_down":
      return <PersonSimple {...props} style={{ transform: "rotate(90deg)" }} />;
    default:
      return <ShieldCheck {...props} />;
  }
}

export function severityTone(severity: number) {
  if (severity >= 4) return { label: "Critical", text: "text-sev-high", bg: "bg-sev-high", ring: "ring-sev-high/40" };
  if (severity === 3) return { label: "Serious", text: "text-sev-mid", bg: "bg-sev-mid", ring: "ring-sev-mid/40" };
  return { label: "Minor", text: "text-sev-low", bg: "bg-sev-low", ring: "ring-sev-low/40" };
}
