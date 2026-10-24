export type MonitorStatus = "standby" | "monitoring" | "motion" | "alert";

const STYLES: Record<MonitorStatus, { label: string; cls: string; dot: string }> = {
  standby: { label: "Standby", cls: "border-line-strong bg-white/5 text-muted", dot: "bg-faint" },
  monitoring: { label: "Monitoring", cls: "border-sev-low/40 bg-sev-low/10 text-sev-low", dot: "bg-sev-low" },
  motion: { label: "Motion detected", cls: "border-sev-mid/40 bg-sev-mid/10 text-sev-mid", dot: "bg-sev-mid animate-blink" },
  alert: { label: "ALERT", cls: "border-red-bright bg-red text-white animate-pulse-border", dot: "bg-white animate-blink" },
};

export function StatusPill({ status }: { status: MonitorStatus }) {
  const s = STYLES[status];
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 font-mono text-xs font-bold uppercase tracking-widest ${s.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
