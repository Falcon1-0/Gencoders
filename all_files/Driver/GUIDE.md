# COMMAND SENTINEL — Setup & Run Guide

## What you're building
A 3-tab React application that acts as an AI dispatch brain on top of TruckerPath COMMAND.
- **Tab 1 — Dispatcher Hub:** Smart driver-load matching with Claude AI recommendations
- **Tab 2 — Voice Logs:** ElevenLabs autonomous driver check-calls
- **Tab 3 — Cost Intelligence:** Real-time CPM analytics with AI insight cards

---

## Prerequisites

Before you start, make sure you have these installed:

```
Node.js v18 or higher   →   https://nodejs.org
npm v9 or higher        →   comes with Node.js
```

Check your versions:
```bash
node --version    # should print v18.x.x or higher
npm --version     # should print 9.x.x or higher
```

---

## Step 1 — Install dependencies

Open your terminal, navigate to the project folder, and run:

```bash
cd command-sentinel
npm install
```

This installs: React, Vite, Tailwind CSS, Lucide icons, Recharts.
Takes about 30–60 seconds on first run.

---

## Step 2 — Set up your API keys

Copy the example env file:
```bash
cp .env.example .env
```

Open `.env` in your editor and fill in your keys:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-...your-key-here...
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key-here
VITE_ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

### Where to get keys:

**Anthropic (Claude API):**
1. Go to https://console.anthropic.com
2. Sign in → API Keys → Create Key
3. Copy and paste into VITE_ANTHROPIC_API_KEY

**ElevenLabs (Voice TTS):**
1. Go to https://elevenlabs.io
2. Sign in → Profile → API Key
3. Copy and paste into VITE_ELEVENLABS_API_KEY
4. To change the voice, go to Voice Library → copy any Voice ID into VITE_ELEVENLABS_VOICE_ID

> **No keys? No problem.**
> The app runs in full demo mode without any API keys.
> Smart Match uses the local algorithm only.
> Voice calls simulate the full call flow with timed state transitions.
> All UI, data, and interactions work perfectly for a demo.

---

## Step 3 — Start the development server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 800ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

Open http://localhost:3000 in your browser.
The app opens automatically if your browser is configured for it.

---

## Step 4 — Using the app (demo walkthrough)

### Tab 1 — Dispatcher Hub

1. Look at the top metrics: fleet average CPM, pending loads, HOS violations
2. You'll see a list of pending loads on the left, and all 20 drivers on the right
3. Click any pending load row to expand it
4. Click the **Smart Match** button — the algorithm scores all drivers instantly
5. If Claude API key is set: Claude generates plain-English justifications per driver
6. Click **Assign Load** on the top-ranked driver
7. The load is marked as assigned and the TMS is updated (mock)

### Tab 2 — Voice Logs

1. Select a driver from the dropdown (only available drivers shown)
2. Select a pending load
3. Click **Preview Sentinel script** to see what the AI will say
4. Click **Initiate Voice Check-Call**
5. Watch the call states: Dialing → Connected → Speaking → Confirmed/Declined
6. If ElevenLabs key is set: real audio plays through your speakers
7. The call is automatically logged in the call history below

### Tab 3 — Cost Intelligence

1. See the stacked bar chart: profit vs fuel vs driver pay per active load
2. Scroll to see the margin table with all load breakdowns
3. The AI Insight card loads automatically on page open
4. If Claude key is set: a real AI-generated insight appears
5. The CPM ranking shows all 20 drivers sorted from most to least efficient
6. Red triangles flag drivers significantly above fleet average CPM

---

## Step 5 — Build for production (for demo deployment)

```bash
npm run build
```

This creates a `dist/` folder with optimized static files.

To preview the production build locally:
```bash
npm run preview
```

### Deploy to Vercel (free, instant):
```bash
npm install -g vercel
vercel
```
Follow the prompts. Add your env variables in the Vercel dashboard under
Project → Settings → Environment Variables.

### Deploy to Netlify (free, instant):
1. Go to https://netlify.com → New site → Deploy manually
2. Drag and drop the `dist/` folder
3. Add env variables under Site Settings → Environment Variables

---

## File structure reference

```
command-sentinel/
├── index.html                    Entry point HTML
├── vite.config.js                Vite bundler config
├── tailwind.config.js            Tailwind design tokens (colors, fonts)
├── postcss.config.js             PostCSS for Tailwind
├── .env.example                  Template — copy to .env and fill keys
├── .env                          Your real keys — NEVER commit this
│
└── src/
    ├── main.jsx                  React app bootstrap
    ├── App.jsx                   Root component — layout + view router
    ├── index.css                 Global styles + custom animations
    │
    ├── data/
    │   └── mockData.js           20 drivers + 10 loads + fleet metrics
    │
    ├── utils/
    │   └── matchEngine.js        Smart Match algorithm (scoring + haversine)
    │
    ├── api/
    │   ├── claudeApi.js          Anthropic Claude API calls (dispatch + cost insight)
    │   └── elevenLabsApi.js      ElevenLabs TTS calls + call state machine
    │
    ├── components/
    │   ├── Sidebar.jsx           Left nav sidebar
    │   ├── UI.jsx                Shared components (badges, cards, bars, headers)
    │   ├── SmartMatchPanel.jsx   Driver ranking panel per load
    │   └── VoiceCallButton.jsx   In-line call button with state machine
    │
    └── pages/
        ├── DispatchView.jsx      Tab 1 — Dispatcher Hub
        ├── VoiceLogsView.jsx     Tab 2 — Voice Logs
        └── CostIntelView.jsx     Tab 3 — Cost Intelligence
```

---

## Common issues and fixes

**Port 3000 already in use:**
```bash
# Kill whatever is on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

**npm install fails:**
```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules
npm install
```

**Tailwind styles not loading:**
```bash
# Make sure postcss.config.js exists and looks correct
# Restart the dev server
npm run dev
```

**Claude API returns 401:**
- Double-check your key starts with `sk-ant-`
- Make sure the key is in `.env`, not `.env.example`
- Restart the dev server after editing `.env` (Vite reads env at startup)

**ElevenLabs audio doesn't play:**
- Check browser console for errors
- Make sure you're on http (not a file:// URL)
- Try a different voice ID from the ElevenLabs voice library
- The app falls back to simulated calls automatically

**Black screen / React crash:**
```bash
# Check terminal for error messages
# Common cause: missing import or syntax error in JSX
# Open browser console (F12) for the exact error
```

---

## Hackathon demo tips

1. Open the app at **http://localhost:3000** — do not use the production build live
2. Pre-expand one load before the judges arrive so Smart Match is ready to click
3. If Claude is slow (>3s), let it stream — the thinking animation looks intentional
4. For the voice call demo, use **Raj Singh** + **Phoenix → Dallas** load — it's the most dramatic
5. Keep the Cost Intelligence tab ready to show the AI insight card
6. If anything breaks, refresh — all state resets cleanly with the mock data

---

## Modifying mock data

To change drivers, loads, or fleet metrics, edit:
```
src/data/mockData.js
```

The file is fully commented. Changes reflect instantly in the browser (hot reload).

---

*Built for the TruckerPath Marketplace & Growth hackathon*
*Stack: React + Vite + Tailwind + Recharts + Claude API + ElevenLabs*
