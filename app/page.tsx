import Link from "next/link";
import {
  ArrowRight,
  CarProfile,
  CheckCircle,
  Eye,
  EyeSlash,
  Fire,
  HandFist,
  Heartbeat,
  LockKey,
  PersonArmsSpread,
  PersonSimple,
  PhoneCall,
  Pulse,
  Siren,
  Timer,
  UserFocus,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { HeroFeed } from "@/components/landing/HeroFeed";
import { Logo } from "@/components/Logo";

const STEPS = [
  {
    icon: VideoCamera,
    title: "Live sources",
    body: "Live traffic camera streams from across Georgia, or a user uploads a clip or streams their own camera.",
    tag: "4,300+ feeds",
  },
  {
    icon: Pulse,
    title: "AI scores every frame",
    body: "Frame by frame, each feed gets a confidence score. An alert is only raised once it clears the threshold: 2 of 3 checks agreeing at 60%+.",
    tag: "Confidence gated",
  },
  {
    icon: UserFocus,
    title: "Human in the loop",
    body: "A person reads the alert details and the uploaded snapshot before anything escalates.",
    tag: "Every alert",
  },
  {
    icon: PhoneCall,
    title: "One-click dispatch",
    body: "If it needs emergency services, one click sends the call: an AI agent phones the right service with accurate context on the situation for dispatch.",
    tag: "Simulated",
  },
];

const WATCHES = [
  { icon: CarProfile, title: "Car crashes", body: "The big one for highway cams: collisions, spin-outs, vehicles stopped mid-lane." },
  { icon: PersonArmsSpread, title: "Falls", body: "A person going down suddenly, caught across consecutive frames.", iconTilt: true },
  { icon: Heartbeat, title: "Seizures & medical events", body: "Someone convulsing, collapsing, or clutching their chest." },
  { icon: HandFist, title: "Fights & assault", body: "People physically attacking each other, not playing or exercising." },
  { icon: Siren, title: "Violent crime", body: "Severe assaults and attacks in progress on public feeds." },
  { icon: PersonSimple, title: "Person down", body: "Someone on the ground who has stopped moving. The heartbeat check catches stillness.", iconTilt: true },
  { icon: Fire, title: "Fire & smoke", body: "Visible flames or smoke in frame, from a vehicle fire to a burning bin." },
];

const GUARDRAILS = [
  {
    icon: EyeSlash,
    title: "Nothing is recorded",
    body: "Frames are analyzed and discarded on the spot. Only the snapshot of a confirmed incident is kept, for incident tracking.",
  },
  {
    icon: UserFocus,
    title: "Human in the loop",
    body: "Every alert waits for a person. No notification reaches emergency services without a human approving it first.",
  },
  {
    icon: CheckCircle,
    title: "Confidence is auditable",
    body: "Every check publishes its verdict, vote count and confidence on the dashboard. The 2-of-3, 60%+ threshold is what makes that confidence mean something.",
  },
  {
    icon: Timer,
    title: "One alert per event",
    body: "A 60 second cooldown per camera stops the same incident from paging you every 2 seconds.",
  },
];

const STATS = [
  { value: "4,300+", label: "live cameras statewide" },
  { value: "24/7", label: "autonomous watch" },
  { value: "2/3", label: "checks must agree" },
  { value: "0", label: "raw frames stored" },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#how" className="transition-colors hover:text-fg">How it works</a>
            <a href="#watches" className="transition-colors hover:text-fg">What it watches</a>
            <a href="#guardrails" className="transition-colors hover:text-fg">Guardrails</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/traffic"
              className="group inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold text-fg transition-colors hover:border-white/30 hover:bg-white/5"
            >
              <VideoCamera size={16} weight="bold" aria-hidden />
              Live traffic cams
            </Link>
            <Link
              href="/report"
              className="group inline-flex h-10 items-center gap-2 rounded-lg bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-bright"
            >
              Report an emergency
              <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative">
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
          <div className="absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-red/10 blur-[120px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 pb-14 pt-8 sm:px-6 sm:pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:pt-12">
            <div className="animate-rise">
              <p className="inline-flex items-center gap-2 rounded-full border border-red/40 bg-red/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-red-bright">
                <span className="h-1.5 w-1.5 rounded-full bg-red-bright animate-blink" />
                Autonomous emergency detection
              </p>
              <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Cameras record.
                <br />
                <span className="text-red-bright text-glow">Raven responds.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                4,300+ live traffic cameras across Georgia, with an AI watching 24/7 for crashes, assaults and
                medical emergencies.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/traffic"
                  className="group inline-flex h-12 items-center gap-2 rounded-lg bg-red px-6 font-semibold text-white shadow-[0_0_40px_-8px_var(--red)] transition-colors hover:bg-red-bright"
                >
                  <Eye size={18} weight="bold" aria-hidden />
                  Watch a live feed
                  <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center rounded-lg border border-line-strong px-6 font-semibold text-fg transition-colors hover:border-white/30 hover:bg-white/5"
                >
                  See how it works
                </a>
              </div>

              <div className="relative mt-12 overflow-hidden rounded-2xl border border-red/40 bg-[linear-gradient(135deg,#3a0503_0%,#120303_45%,#050505_100%)]">
                <div className="bg-grid absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,transparent,black)]" aria-hidden />
                <div className="relative px-5 py-5 sm:px-6">
                  <p className="text-sm text-muted">Pick any GDOT feed in the state and detection runs on real traffic, right now.</p>
                  <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
                    {STATS.map((s) => (
                      <div key={s.label} className="bg-black/40 px-4 py-3.5">
                        <dt className="sr-only">{s.label}</dt>
                        <dd className="font-display text-2xl font-bold tabular-nums">{s.value}</dd>
                        <dd className="mt-1 text-xs leading-snug text-white/50">{s.label}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>

            <HeroFeed />
          </div>
        </section>

        {/* How it works: pipeline, watch list, guardrails in one section */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 border-t border-line px-4 py-20 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">How it works</p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight lg:whitespace-nowrap">
              Live feeds across Georgia. Emergencies flagged, not recorded.
            </h2>
          </div>

          <ol className="mt-10 divide-y divide-line border-y border-line">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-center gap-4 py-3.5">
                <span className="w-8 shrink-0 font-mono text-sm font-bold tabular-nums text-faint">0{i + 1}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red/40 bg-bg text-red-bright">
                  <s.icon size={18} weight="bold" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
                  <h3 className="shrink-0 font-semibold">{s.title}</h3>
                  <p className="min-w-0 text-sm text-muted">{s.body}</p>
                </div>
                <span className="hidden shrink-0 rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-faint sm:inline-block">
                  {s.tag}
                </span>
              </li>
            ))}
          </ol>

          {/* Watch list + guardrails: compact lists, one row each */}
          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div id="watches" className="scroll-mt-24">
              <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">What it watches for</h3>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {WATCHES.map((w) => (
                  <li key={w.title} className="flex items-center gap-4 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red text-white">
                      <w.icon
                        size={18}
                        weight="bold"
                        aria-hidden
                        style={w.iconTilt ? { transform: `rotate(${w.title === "Falls" ? "-38deg" : "90deg"})` } : undefined}
                      />
                    </span>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                      <h4 className="shrink-0 font-semibold">{w.title}</h4>
                      <p className="min-w-0 text-sm text-muted">{w.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted">
                Same pipeline runs anywhere: baby monitors, senior-care and elder cameras, and business security feeds
                that no guard can all watch at once.
              </p>
            </div>

            <div id="guardrails" className="scroll-mt-24">
              <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">Guardrails</h3>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {GUARDRAILS.map((g) => (
                  <li key={g.title} className="flex items-center gap-4 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line-strong text-red-bright">
                      <g.icon size={18} weight="bold" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                      <h4 className="shrink-0 font-semibold">{g.title}</h4>
                      <p className="min-w-0 text-sm text-muted">{g.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 text-sm text-muted">
                <LockKey size={16} weight="bold" className="mt-0.5 shrink-0 text-sev-low" aria-hidden />
                Built to help people, not to build a surveillance archive.
              </p>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-faint sm:px-6">
          <Logo />
          <p>Frames analyzed, never stored. Humans approve every alert.</p>
        </div>
      </footer>
    </div>
  );
}
