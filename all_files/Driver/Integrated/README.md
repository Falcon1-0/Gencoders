# Integrated FleetMind

This folder combines the `Dispatcher` React experience with the Python `Backend` dispatch engine.

## What changed

- The dispatcher now has an **Open backend** button on the recommendation card.
- Clicking it opens the original backend app in a separate browser tab, so the dispatcher and backend stay as two separate UIs.
- Ollama is optional in the integrated build and is disabled by default, so the app runs cleanly on the deterministic engine without local LLM setup.
- A root `npm run dev` command starts:
  - the dispatcher frontend on `http://127.0.0.1:3000`
  - the dispatcher Node API on `http://127.0.0.1:3001`
  - the Python backend on `http://127.0.0.1:8000`

## Run

Install frontend dependencies:

```powershell
cd Integrated
npm install
npm install --prefix Dispatcher
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

## Notes

- The Vite proxy only sends dispatcher APIs to port `3001`.
- The dispatcher opens the backend UI directly at `http://127.0.0.1:8000` by default.
- You can override that button target with `VITE_BACKEND_APP_URL`.
- To opt into Ollama later, set `OLLAMA_ENABLED=true` before starting the dispatcher server.
- The backend now runs without a forced `.env` override, so Twilio/ElevenLabs/simulation behavior follows your original backend configuration.
- If your backend is exposed through ngrok, set `PUBLIC_BASE_URL` in `Backend/.env` to the ngrok HTTPS URL so Twilio can reach `/twilio/voice/...` and `/twilio/recording/...`.
- If you want the dispatcher's `Open backend` button to open the ngrok URL instead of local port `8000`, set `VITE_BACKEND_APP_URL` to that same public URL before starting the dispatcher.
