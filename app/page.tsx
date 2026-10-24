import Link from "next/link";
import {
  ArrowRight,
  BellRinging,
  Brain,
  CheckCircle,
  Eye,
  EyeSlash,
  HandPalm,
  Pulse,
  ShieldCheck,
  Timer,
  UserFocus,
} from "@phosphor-icons/react/dist/ssr";
import { EventIcon } from "@/components/EventIcon";
import { HeroFeed } from "@/components/landing/HeroFeed";
import { Logo } from "@/components/Logo";
import type { EventType } from "@/lib/types";

const STEPS = [
  {
    icon: Pulse,
    title: "Motion gate",
    body: "Your browser compares frames every 500ms and only wakes the AI when something moves, plus a check every 6 seconds to catch someone lying still.",
    tag: "Client side · free",
  },
  {
    icon: Brain,
    title: "Vision model",
    body: "Three consecutive frames go to a multimodal model that reads the change across them: a fall, not someone sitting down.",
    tag: "~3s per check",
  },
  {
    icon: CheckCircle,
    title: "2 of 3 confirmation",
    body: "An incident fires only when 2 of the last 3 checks agree with at least 60% average confidence. One odd frame never pages anyone.",
    tag: "Cuts false alarms",
  },
  {
    icon: BellRinging,
    title: "Instant alert",
    body: "The confirmed incident hits the dashboard, lands on your phone through Discord, and is routed (simulated) to the nearest real ambulance, police or fire station.",
    tag: "< 6s end to end",
  },
];

const EVENTS: { type: EventType; title: string; body: string; sev: string }[] = [
  { type: "fall", title: "Falls", body: "A person going down suddenly, caught across consecutive frames.", sev: "Severity 3 to 5" },
  { type: "fight", title: "Fights", body: "People physically attacking each other, not playing or exercising.", sev: "Severity 3 to 5" },
  { type: "fire_smoke", title: "Fire & smoke", body: "Visible flames or smoke in frame, from a pan fire to a burning bin.", sev: "Severity 4 to 5" },
  { type: "person_down", title: "Person down", body: "Someone on the floor who has stopped moving. The heartbeat check catches stillness.", sev: "Severity 4 to 5" },
];

const STATS = [
  { value: "<6s", label: "fall to phone alert" },
  { value: "2/3", label: "checks must agree" },
  { value: "60s", label: "cooldown per event" },
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
            <a href="#detects" className="transition-colors hover:text-fg">What it detects</a>
            <a href="#privacy" className="transition-colors hover:text-fg">Privacy</a>
          </div>
          <Link
            href="/monitor"
            className="group inline-flex h-10 items-center gap-2 rounded-lg bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-bright"
          >
            Launch monitor
            <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative">
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
          <div className="absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-red/10 blur-[120px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 pb-28 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
            <div className="animate-rise">
              <p className="inline-flex items-center gap-2 rounded-full border border-red/40 bg-red/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-red-bright">
                <span className="h-1.5 w-1.5 rounded-full bg-red-bright animate-blink" />
                Live AI emergency detection
              </p>
              <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Cameras record.
                <br />
                <span className="text-red-bright text-glow">HawkSight responds.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Point any camera at a room. Within seconds of a fall, a fight, fire, or someone lying motionless, a confirmed
                incident lights up your dashboard and buzzes your phone.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/monitor"
                  className="group inline-flex h-12 items-center gap-2 rounded-lg bg-red px-6 font-semibold text-white shadow-[0_0_40px_-8px_var(--red)] transition-colors hover:bg-red-bright"
                >
                  <Eye size={18} weight="bold" aria-hidden />
                  Start watching
                  <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center rounded-lg border border-line-strong px-6 font-semibold text-fg transition-colors hover:border-white/30 hover:bg-white/5"
                >
                  See how it works
                </a>
              </div>

              <dl className="mt-14 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                {STATS.map((s) => (
                  <div key={s.label} className="bg-surface px-4 py-4">
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums">{s.value}</dd>
                    <dd className="mt-1 text-xs leading-snug text-faint">{s.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroFeed />
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">The problem</p>
            <p className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
              Most cameras are never watched live. Falls and attacks are found{" "}
              <span className="text-muted">after the fact</span>, when minutes already mattered.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">How it works</p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">Four stages, one alert you can trust.</h2>
            <p className="mt-4 text-muted">
              Each stage filters the one before it, so the model only sees frames that matter and your phone only rings for
              events that held up across multiple checks.
            </p>
          </div>

          <ol className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-[38px] hidden h-px bg-gradient-to-r from-red/0 via-red/60 to-red/0 lg:block" aria-hidden />
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="group relative rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-red/50"
              >
                <div className="flex items-center justify-between">
                  <span className="relative grid h-12 w-12 place-items-center rounded-xl border border-red/40 bg-bg text-red-bright">
                    <s.icon size={22} weight="bold" aria-hidden />
                  </span>
                  <span className="font-mono text-4xl font-bold text-white/5 transition-colors group-hover:text-red/20">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                <p className="mt-5 inline-block rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-faint">{s.tag}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Detects */}
        <section id="detects" className="scroll-mt-20 border-t border-line bg-[linear-gradient(180deg,var(--surface)_0%,var(--bg)_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">What it detects</p>
                <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">Reads context, not just pixels.</h2>
              </div>
              <p className="max-w-sm text-sm text-muted">
                Sitting, bending to tie a shoe, waving, exercising and playing are all classed as normal. When the model is not
                clearly sure, it says nothing.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EVENTS.map((e) => (
                <article
                  key={e.type}
                  className="relative overflow-hidden rounded-2xl border border-line bg-surface-2 p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red/10 blur-2xl" aria-hidden />
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-red text-white">
                    <EventIcon type={e.type} size={24} />
                  </span>
                  <h3 className="mt-6 font-display text-xl font-semibold">{e.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{e.body}</p>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-red-bright">{e.sev}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-red-bright">Responsible by design</p>
              <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">Watches without hoarding.</h2>
              <p className="mt-4 max-w-lg text-muted">
                HawkSight is built to help people, not to build a surveillance archive. Humans stay in the loop for every
                incident.
              </p>
            </div>
            <ul className="grid gap-3">
              {[
                { icon: EyeSlash, title: "Frames are analyzed and discarded", body: "Nothing is recorded. Only the snapshot of a flagged incident is kept." },
                { icon: UserFocus, title: "Humans acknowledge every incident", body: "Alerts stay open and pulsing until a person reviews and acknowledges them." },
                { icon: ShieldCheck, title: "Confidence shown openly", body: "Every verdict, vote and confidence score is visible on the dashboard." },
                { icon: Timer, title: "One alert per event", body: "A 60 second cooldown stops the same incident from paging you every 2 seconds." },
              ].map((p) => (
                <li key={p.title} className="flex gap-4 rounded-xl border border-line bg-surface p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line-strong text-red-bright">
                    <p.icon size={20} weight="bold" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-red/40 bg-[linear-gradient(135deg,#3a0503_0%,#120303_45%,#050505_100%)] px-6 py-16 sm:px-14">
            <div className="bg-grid absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,transparent,black)]" aria-hidden />
            <div className="relative flex flex-wrap items-center justify-between gap-8">
              <div className="max-w-xl">
                <h2 className="font-display text-4xl font-bold tracking-tight">Give your camera a pair of eyes.</h2>
                <p className="mt-3 text-muted">Use your webcam or a sample clip. Stage a fall and watch the alert land.</p>
              </div>
              <Link
                href="/monitor"
                className="group inline-flex h-12 items-center gap-2 rounded-lg bg-red px-6 font-semibold text-white shadow-[0_0_40px_-8px_var(--red)] transition-colors hover:bg-red-bright"
              >
                <HandPalm size={18} weight="bold" aria-hidden />
                Open the live monitor
                <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-faint sm:px-6">
          <Logo />
          <p>Built for fast response. Frames analyzed, never stored.</p>
        </div>
      </footer>
    </div>
  );
}
