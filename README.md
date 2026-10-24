# Raven

Raven turns an ordinary camera feed into an early-warning system. It watches video for falls, fights, fire and people who have gone down, confirms the event with an AI vision model, and shows it on an operator dashboard with the nearest ambulance, police or fire station.

> Emergency dispatch is **simulated**. Raven looks up real stations nearby but never calls, messages or contacts anyone.

## Features

### Detection
- **Motion gate** – the browser compares frames every 500 ms and only wakes the AI when something moves. A check every 6 seconds still catches someone lying still.
- **Vision model** – three consecutive frames go to Google Gemini, which reads the change across them (a fall, not someone sitting down).
- **2-of-3 confirmation** – an incident is raised only when 2 of the last 3 checks agree with at least 60% average confidence, so one odd frame never triggers an alert.
- **Cooldown** – 60 seconds per event to avoid duplicate incidents.
- **Event types** – falls, fights, fire and smoke, and person down, each with a 1–5 severity.

### Operator dashboard (`/admin`)
- Live incident feed with snapshot, severity, confidence and time.
- Acknowledge or dismiss incidents, and send a test incident to check the pipeline.
- Alert sound for new incidents.
- Status chips showing whether the vision model is configured.
- Set the camera's location so the nearest stations can be found.

### Simulated dispatch
- Finds the nearest real ambulance, police and fire stations using Google Places.
- Shows distance, estimated arrival time and a map link, with a station map.
- Operators can pick a responder manually when a report is unclear.

### Live traffic cameras (`/traffic`)
- Browses Georgia DOT 511 traffic cameras and plays their live HLS streams.
- Runs the same detection pipeline on traffic footage.
- Responders map of nearby stations.

### Citizen reports (`/report`)
- Members of the public can submit an emergency report with their location and a short note.
- The report is analysed by the vision model and a status page (`/report/[id]`) shows when responders are confirmed and their estimated arrival.

### Privacy
- Motion detection runs in the browser.
- No raw video is stored; only the snapshot attached to a confirmed incident is kept, in memory.

## Tech stack

- [Next.js](https://nextjs.org) 15 (App Router), React 19, TypeScript
- Tailwind CSS 4, Phosphor icons
- Google Gemini (`@google/genai`) for vision analysis
- Google Places / Maps for station lookup and maps
- GDOT 511 API and `hls.js` for traffic cameras

## Getting started

```bash
npm install
# create .env.local with the variables below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API key for vision analysis (required) |
| `GEMINI_MODEL` | Override the Gemini model |
| `MOTION_THRESHOLD` | Motion sensitivity, default `8` |
| `CONFIRM_MIN_CONFIDENCE` | Minimum average confidence to confirm, default `0.6` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps / Places key for dispatch and maps |
| `GDOT_511_API_KEY` | Georgia 511 API key for traffic cameras |

## Project layout

```
app/          Pages (/, /admin, /monitor, /traffic, /report) and API routes
components/   Dashboard, traffic, report and landing UI
hooks/        Incident, location and monitor hooks
lib/          Detection (motion, prompt, vision, confirm), dispatch, GDOT 511, in-memory store
```

## Notes

Incidents are kept in memory (last 50), so they reset when the server restarts. This is a demo, not a production emergency system.
