# FleetMind

FleetMind is a hackathon-ready prototype for the Trucker Path COMMAND intelligence layer.

It solves **two real problems** from the brief:

1. **Smart Dispatch** - ranks drivers for a new load using location, HOS, deadhead, lane fit, and projected cost.
2. **Cost Intelligence** - explains *why* CPM is high and gives specific actions, not just charts.

The app is intentionally built to be:

- **demo-safe**: works with mock data even if no API keys are set
- **free-first**: browser speech is free; live weather uses the free Open-Meteo API; ElevenLabs is optional; dispatch LLM runs through local Ollama
- **easy to integrate**: React frontend plus a lightweight local Node API for live dispatch simulation and Ollama-backed ranking

---

## Tech stack

- React + Vite
- Node + Express API
- Tailwind CSS
- Recharts
- Lucide icons
- Local Ollama for dispatch decisions
- Optional: ElevenLabs TTS
- Optional: Open-Meteo live weather

---

## What the judges can interact with

### 1) Smart Dispatch

- Watch a simulated live dispatch board
- See:
  - moving board clock
  - incoming load queue
  - live event feed
  - ranked drivers
  - best-fit score
  - projected CPM
  - expected savings vs the nearest truck
  - the exact reason the nearest truck is *not* the best truck
  - provider/fallback/debug status for Ollama vs heuristic mode
- Click **Play dispatch brief** for a voice summary

### 2) Cost Intelligence

- Click one of the suggested questions or type your own
- Examples:
  - `Why is Johnson's CPM so high?`
  - `Which lane is hurting margin the most?`
  - `What happens if we cut deadhead by 10%?`
  - `Who should we coach first?`
- The app returns:
  - plain-English explanation
  - supporting metrics
  - next actions
  - optional voice playback

---

## Project structure

```text
fleetmind/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── index.html
├── .env.example
├── README.md
├── server/
│   ├── index.mjs
│   ├── config.js
│   ├── createApp.js
│   ├── dispatch/
│   └── liveBoard/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── data/
    │   └── mockData.js
    ├── lib/
    │   ├── costEngine.js
    │   ├── dispatchEngine.js
    │   ├── formatters.js
    │   ├── geo.js
    │   ├── voice.js
    │   └── weather.js
    ├── components/
    │   ├── BrandMark.jsx
    │   ├── CostBarChart.jsx
    │   ├── DriverTable.jsx
    │   ├── LaneTable.jsx
    │   ├── MetricCard.jsx
    │   ├── QuestionChips.jsx
    │   ├── RecommendationPanel.jsx
    │   ├── SettingsDrawer.jsx
    │   ├── Sidebar.jsx
    │   ├── StatusBadge.jsx
    │   ├── TopBar.jsx
    │   └── WeeklyTrendChart.jsx
    └── pages/
        ├── CostPage.jsx
        └── DispatchPage.jsx
```

---

## Local run - easiest method

### 1) Install Node.js and Ollama

Install **Node 20 or Node 22**.

Install **Ollama** from `https://ollama.com/download`.

### 2) Open a terminal in the project folder

```bash
cd fleetmind
```

### 3) Install dependencies

```bash
npm install
```

### 4) Start the dev server

```bash
ollama serve
```

In another terminal, pull the default model once:

```bash
ollama pull qwen3:8b
```

Then start the app:

```bash
npm run dev
```

### 5) Open the app

Open the URL shown in the terminal, usually:

```text
http://localhost:3000
```

The React app runs on port `3000` and the local API runs on port `3001`.

---

## Google Colab run - if you do not want to use local setup

### Step 1: upload the project zip to Colab

Upload `fleetmind.zip` into the left sidebar files panel.

### Step 2: run this cell

```python
!apt-get update -qq
!apt-get install -y -qq curl unzip
!curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
!apt-get install -y nodejs
!node -v
!npm -v
```

### Step 3: unzip the project

```python
%cd /content
!rm -rf fleetmind
!unzip -q fleetmind.zip -d /content/
%cd /content/fleetmind
```

### Step 4: optional env file for ElevenLabs

```python
%%writefile .env
VITE_ELEVENLABS_API_KEY=
VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

If you do not want ElevenLabs, leave both values blank.

### Step 5: install packages

```python
!npm install
```

### Step 6: install Cloudflare tunnel helper

```python
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -O cloudflared.deb
!dpkg -i cloudflared.deb
```

### Step 7: start the app

```python
!npm run dev -- --host 0.0.0.0 --port 3000 > /content/fleetmind.log 2>&1 &
!cloudflared tunnel --url http://127.0.0.1:3000 > /content/tunnel.log 2>&1 &
```

### Step 8: get the public link

```python
!sleep 8
!cat /content/tunnel.log | grep -o 'https://[-0-9a-z]*\.trycloudflare.com' | head -n 1
```

Open the URL that appears.

---

## Optional ElevenLabs setup

The app already works without ElevenLabs.

If you want the bonus voice feature:

1. Open the app
2. Click **Settings**
3. Turn on **Use ElevenLabs**
4. Paste your API key
5. Optional: change the voice ID
6. Click **Play dispatch brief** or **Play voice brief**

If you leave this off, the app uses the browser's built-in speech engine for free.

---

## Deploy to Vercel

### Fastest way

1. Push the folder to GitHub
2. Import the repo into Vercel
3. Vercel will detect Vite automatically
4. Deploy

### Optional env vars in Vercel

Add these only if you want ElevenLabs through build-time env values:

- `VITE_ELEVENLABS_API_KEY`
- `VITE_ELEVENLABS_VOICE_ID`

You can also skip env vars and just paste the key into the app Settings panel during the demo.

---

## Demo-safe cities

The dispatch engine is guaranteed to work with the built-in cities from `src/lib/geo.js`, including:

- Phoenix, AZ
- Dallas, TX
- Tucson, AZ
- El Paso, TX
- Albuquerque, NM
- Amarillo, TX
- Flagstaff, AZ
- Oklahoma City, OK
- Little Rock, AR
- Houston, TX
- Los Angeles, CA
- Memphis, TN
- Kansas City, MO
- San Antonio, TX
- Mesa, AZ
- Lubbock, TX

Use these city names for the safest live demo.

---

## What to say in the demo

### 30-second dispatch story

> "COMMAND already knows where the trucks are, what the HOS status is, and what lanes cost. The gap is that the dispatcher still has to make the decision manually. FleetMind ranks every driver, explains the tradeoff, and shows why the closest truck is often the wrong truck."

### 30-second cost story

> "Cost per mile is only useful if you know why it changed. FleetMind turns CPM into an explanation: which driver, which lane, and which behavior caused the increase, plus the next action the fleet owner should take."

### 15-second integration story

> "This is a front-end intelligence layer, not a replacement TMS. It can plug into existing COMMAND data and even run in an embedded dashboard mode."

---

## Where to customize the demo data

Open:

```text
src/data/mockData.js
```

You can change:

- driver names
- cities
- HOS values
- route costs
- weekly CPM values
- lane analytics
- question suggestions

---

## If something goes wrong

### `npm install` fails

Make sure Node.js is installed correctly:

```bash
node -v
npm -v
```

### The voice button does nothing

- Try browser speech first by turning off ElevenLabs in Settings
- Some browsers require user interaction before audio playback

### Live weather does not load

Turn off **Use live weather** in Settings. The app still works fully with built-in corridor risk.

### Custom cities do not rank correctly

Use one of the built-in demo cities for the live demo.

---

## Best hackathon flow

1. Show the dispatch page first
2. Run the default Phoenix -> Dallas load
3. Explain why the nearest truck is not the best truck
4. Play the voice brief
5. Switch to Cost Intelligence
6. Ask `Why is Johnson's CPM so high?`
7. Show the lane table and weekly trend
8. End with the embed-mode integration story
