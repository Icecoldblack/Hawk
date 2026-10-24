import { BellRinging } from "@phosphor-icons/react/dist/ssr";

/** Decorative mock of a camera feed catching a fall, with the phone alert it triggers. */
export function HeroFeed() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="absolute -inset-8 rounded-[2rem] bg-red/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black">
        {/* Feed header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-bright animate-blink" /> Rec · CAM-01 · Lobby
          </span>
          <span>14:32:07</span>
        </div>

        {/* Scene */}
        <div className="relative aspect-[16/10] bg-[radial-gradient(ellipse_at_30%_20%,#2a1210_0%,#0d0b0b_55%,#060606_100%)]">
          <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full">
            {/* Room: floor plane and a doorway */}
            <path d="M0 290 L640 270 L640 400 L0 400 Z" fill="#141010" />
            <path d="M0 290 L640 270" stroke="#2b1d1b" strokeWidth="2" />
            <rect x="470" y="90" width="90" height="185" fill="#0a0808" stroke="#2b1d1b" strokeWidth="2" />
            <rect x="90" y="215" width="120" height="70" rx="6" fill="#1a1414" stroke="#2b1d1b" />
            {/* Fallen person silhouette */}
            <g fill="#3a2a28">
              <circle cx="262" cy="300" r="17" />
              <rect x="278" y="290" width="110" height="26" rx="13" />
              <rect x="380" y="296" width="80" height="16" rx="8" transform="rotate(8 380 296)" />
              <rect x="300" y="276" width="62" height="13" rx="6.5" transform="rotate(-24 300 276)" />
            </g>
          </svg>

          {/* Detection box */}
          <div className="absolute left-[36%] top-[63%] h-[22%] w-[40%] -translate-x-[12%] rounded-sm border-2 border-red-bright shadow-[0_0_24px_var(--red-glow)]">
            <span className="absolute -top-6 left-[-2px] rounded-sm bg-red px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              Fall · 92%
            </span>
          </div>

          {/* Corner brackets */}
          {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "left-3 bottom-3 border-l-2 border-b-2", "right-3 bottom-3 border-r-2 border-b-2"].map((c) => (
            <span key={c} className={`absolute h-5 w-5 border-white/50 ${c}`} />
          ))}

          {/* Scanline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[10%] animate-scan bg-gradient-to-b from-transparent via-red/25 to-transparent" />
        </div>

        {/* Confirmation strip */}
        <div className="grid grid-cols-3 gap-px border-t border-line bg-line font-mono text-[11px]">
          {[
            ["T-2", "fall", "0.88"],
            ["T-1", "fall", "0.94"],
            ["T-0", "fall", "0.93"],
          ].map(([t, type, conf]) => (
            <div key={t} className="flex items-center justify-between bg-surface px-3 py-2">
              <span className="text-faint">{t}</span>
              <span className="text-red-bright">{type}</span>
              <span className="text-muted">{conf}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phone alert toast */}
      <div className="absolute -bottom-10 -right-2 w-72 animate-rise rounded-xl border border-line-strong bg-surface-2/95 p-3.5 shadow-2xl shadow-black backdrop-blur sm:-right-10 [animation-delay:600ms]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red text-white">
            <BellRinging size={18} weight="fill" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-faint">Discord · now</p>
            <p className="mt-0.5 text-sm font-semibold">ALERT: FALL (severity 4/5)</p>
            <p className="mt-0.5 text-xs text-muted">Person fell near the lobby entrance and has not got up.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
