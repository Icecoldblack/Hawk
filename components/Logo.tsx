import Link from "next/link";
import { useId } from "react";

// Almond eye opening, tall enough that the iris stays fully visible while it scans.
const EYE = "M4.5 18 C 10 27, 22 27, 27.5 18 C 22 9, 10 9, 4.5 18 Z";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  const clipId = `eye-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#0c0c0d" stroke="#e10600" strokeWidth="1.5" />
      {/* Stylized hawk eye: brow stroke over a red iris. */}
      <path d="M4.5 10.5 C 10 4, 22 4, 27.5 9.5" fill="none" stroke="#f5f5f4" strokeWidth="2.2" strokeLinecap="round" />
      <clipPath id={clipId}>
        <path d={EYE} />
      </clipPath>
      {/* The eye blinks as a whole; the iris scans left and right inside it. */}
      <g className="logo-blink">
        <path d={EYE} fill="none" stroke="#f5f5f4" strokeWidth="1.6" strokeLinejoin="round" />
        <g clipPath={`url(#${clipId})`}>
          <g className="logo-iris">
            <circle cx="16" cy="18" r="3.6" fill="#e10600" />
            <circle cx="16" cy="18" r="1.3" fill="#050505" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md" aria-label="HawkSight home">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight">
        Hawk<span className="text-red-bright">Sight</span>
      </span>
    </Link>
  );
}
