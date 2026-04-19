# Integrated FleetMind

This folder now gives you one localhost entry point with role-based routing:

- `/` shows the login page first
- admin credentials open the integrated dispatcher section at `/integrated/`
- driver credentials open the original DCH driver page at `/driver/`

## What changed

- A new login portal is served from the Dispatcher Express server.
- The Dispatcher UI is built for `/integrated/`.
- The Driver UI is built for `/driver/`.
- Admin and driver flows stay as separate frontends, but both are launched from the same localhost portal.
- The backend still runs as its own app on port `8000`, and the dispatcher can still open it from its button.
- Ollama is optional in the integrated build and is disabled by default, so the app runs cleanly on the deterministic engine without local LLM setup.

## Run

Install frontend dependencies:

```powershell
cd Integrated
npm install
npm install --prefix Dispatcher
npm install --prefix Driver
```

Install backend dependencies:

```powershell
python -m pip install -r Backend\requirements.txt
```

Start everything:

```powershell
npm run dev
```

Open `http://127.0.0.1:3000`.

## Demo credentials

- Admin: `admin` / `admin123`
- Driver: `driver` / `driver123`

## Notes

- The single localhost entry point is the Dispatcher Express server on port `3000`.
- The dispatcher API is served by that same server, so the integrated dispatcher frontend now uses one origin for the login page and its `/api` calls.
- The dispatcher still opens the backend UI directly at `http://127.0.0.1:8000` by default.
- You can override that button target with `VITE_BACKEND_APP_URL`.
- To opt into Ollama later, set `OLLAMA_ENABLED=true` before starting the dispatcher server.
- The backend now runs without a forced `.env` override, so Twilio/ElevenLabs/simulation behavior follows your original backend configuration.
- If your backend is exposed through ngrok, set `PUBLIC_BASE_URL` in `Backend/.env` to the ngrok HTTPS URL so Twilio can reach `/twilio/voice/...` and `/twilio/recording/...`.
- If you want the dispatcher's `Open backend` button to open the ngrok URL instead of local port `8000`, set `VITE_BACKEND_APP_URL` to that same public URL before starting the dispatcher.
