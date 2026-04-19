# Truck Dispatch Ranking + AI Calling

This app:
1. takes source and target coordinates,
2. filters drivers whose remaining HOS is not enough for the trip,
3. ranks the remaining drivers by distance to source and remaining service time,
4. calls drivers sequentially until one answers yes,
5. stores the transcript/answer in SQLite.

## What this sample uses
- FastAPI for the web app
- SQLite for persistent storage
- ElevenLabs Text to Speech for the spoken question
- ElevenLabs Speech to Text for the driver response
- Twilio for actual outbound phone calls

ElevenLabs supports text-to-speech, speech-to-text, conversational agents, and Twilio/SIP telephony integration for outbound calls. FMCSA HOS rules for property-carrying drivers include the 11-hour driving limit, 14-hour limit, and 30-minute break requirement. citeturn204733view0turn204733view1turn204733view2turn204733view3turn531024view0turn599547view0

## Step-by-step execution

### 1) Create a virtual environment
```bash
cd truck_dispatcher
python -m venv .venv
source .venv/bin/activate
```

### 2) Install dependencies
```bash
pip install -r requirements.txt
```

### 3) Copy the environment file
```bash
cp .env.example .env
```

Fill in:
- `ELEVENLABS_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `PUBLIC_BASE_URL`

For local development, expose the app with ngrok or another public tunnel and set `PUBLIC_BASE_URL` to that public URL.

### 4) Start the server
```bash
python app.py
```

Or:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 5) Open the UI
Go to:
`http://127.0.0.1:8000`

### 6) Rank drivers
Click **Rank eligible drivers**.
The backend will:
- compute distance from each driver to the source,
- estimate delivery time from source to target,
- exclude any driver whose `hos_left_hours` is less than the required hours,
- sort the rest by score.

### 7) Start sequential calling
Click **Start sequential calling**.
The backend will:
- build a question with ElevenLabs TTS,
- call the top-ranked driver,
- record the answer,
- transcribe it with ElevenLabs STT,
- stop on the first driver who says yes,
- assign the task and store the result.

## Important notes
- This sample uses latitude/longitude inputs so the project is self-contained.
- To accept addresses instead of coordinates, add a geocoding step before `/api/rank`.
- HOS logic is simplified to `hos_left_hours` from the dataset. In a production system, connect directly to ELD/HOS logs.
- For real phone calls, Twilio must be reachable from the public internet.
- If you want a production telephony stack, ElevenLabs also documents Twilio native integration and batch calling. citeturn204733view2turn204733view3

## API endpoints
- `GET /` — web UI
- `GET /api/drivers` — current dataset
- `POST /api/rank` — returns ranked eligible drivers
- `POST /api/dispatch/start` — starts sequential calling
- `GET /api/jobs/{job_id}` — job status
- `POST /twilio/voice/{job_id}/{driver_id}/{audio_filename}` — Twilio voice webhook
- `POST /twilio/recording/{job_id}/{driver_id}` — Twilio recording callback

## Demo mode
If `SIMULATION_MODE=true`, the app skips outbound calls and uses the `simulated_willing` field from the driver dataset.
