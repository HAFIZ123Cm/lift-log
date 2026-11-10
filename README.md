# Lift Log

A simple gym app for your phone: workout log with progressive-overload reminders, a rest timer that notifies you, a private journal, and an AI coach.

**Open it:** https://hafiz123cm.github.io/lift-log/ → Chrome menu ⋮ → **Add to Home screen / Install app**.

## Tabs
- **Workout** — calendar with your split (Push/Pull/Legs or Upper/Lower). Tap a day, log weight × reps (kg, lb, plates per side, or machine pin). Each exercise shows what you did last time and what to beat today, the muscles it trains, and a coach guide with the common gym mistakes. All exercise names, sets, reps and the weekly schedule can be edited.
- **Timer** — 3:00 rest timer (other lengths too). Sends a phone notification when rest is over, even while you use other apps. Can auto-start when you tick a set.
- **Journal** — vent, write the mistakes you made today, and one thing to do better.
- **Advisor** — AI coach that can see your workout log. Free options: NVIDIA (needs the bridge below), Groq, or Google Gemini.

All data stays on your phone (localStorage). Use ⚙️ → Save backup now and then.

## NVIDIA bridge (one time)
NVIDIA's free API (build.nvidia.com) blocks calls made straight from web pages, so the app sends them through a tiny free Cloudflare Worker:
1. Get a free key at build.nvidia.com (starts with `nvapi-`).
2. dash.cloudflare.com → Workers & Pages → Create → Hello World → Deploy → Edit code.
3. Replace the code with [`nvidia-proxy.js`](nvidia-proxy.js) and Deploy.
4. In the app: Advisor → AI settings → NVIDIA → paste your key and the `*.workers.dev` link.
