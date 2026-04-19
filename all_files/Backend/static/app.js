const state = {
  driverMap: new Map(),
  currentJobId: null,
  pollTimer: null,
  totalCandidates: 0,
  calledCount: 0,
  talkTimer: null,
};

function $(id) { return document.getElementById(id); }

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function appendLog(message) {
  const logEl = $("log");
  if (!logEl) return;
  const line = document.createElement("div");
  const ts = new Date().toLocaleTimeString();
  line.textContent = `[${ts}] ${message}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  try { return JSON.parse(text); }
  catch { throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 200)}`); }
}

function num(v, digits = 2) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "";
}

function getValue(id) {
  const el = $(id);
  if (!el) throw new Error(`Missing element with id="${id}"`);
  return el.value;
}

function getOptionalNumber(id) {
  const el = $(id);
  if (!el) return null;
  const raw = String(el.value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function collectPayload() {
  return {
    delivery_name: getValue("delivery-name"),
    source_lat: parseFloat(getValue("source-lat")),
    source_lng: parseFloat(getValue("source-lng")),
    target_lat: parseFloat(getValue("target-lat")),
    target_lng: parseFloat(getValue("target-lng")),
    avg_speed_mph: parseFloat(getValue("avg-speed")),
    route_multiplier: parseFloat(getValue("route-multiplier")),
    estimated_delivery_hours: getOptionalNumber("manual-hours"),
    parcel_delicacy: getValue("parcelDelicacy"),
  };
}

function renderDrivers(drivers) {
  const tbody = $("drivers-body");
  if (!tbody) return;
  state.driverMap.clear();
  tbody.innerHTML = drivers.map((d) => {
    state.driverMap.set(String(d.driver_id), d);
    const history = `On-time ${d.on_time_deliveries ?? 0} / Late ${d.late_deliveries ?? 0} / Damaged ${d.damaged_deliveries ?? 0}`;
    return `<tr>
      <td>${d.driver_id ?? ""}</td>
      <td>${d.name ?? ""}</td>
      <td>${num(d.current_lat, 4)}, ${num(d.current_lng, 4)}</td>
      <td>${num(d.hos_left_hours, 2)}</td>
      <td>${num(d.rating, 2)}</td>
      <td>${history}</td>
      <td>${d.simulated_willing ? "Yes" : "No"}</td>
    </tr>`;
  }).join("");
  setText("driver-count", `${drivers.length} drivers loaded`);
}

function renderRankedDrivers(ranked) {
  const tbody = $("ranked-body");
  if (!tbody) return;
  tbody.innerHTML = ranked.map((d, idx) => {
    const fb = state.driverMap.get(String(d.driver_id)) || {};
    return `<tr>
      <td>${idx + 1}</td>
      <td>${d.name ?? fb.name ?? d.driver_id ?? ""}</td>
      <td>${num(d.distance_to_source_mi ?? d.distance_to_source, 2)}</td>
      <td>${num(d.estimated_hours_to_complete ?? d.required_hours, 2)}</td>
      <td>${num(d.hos_left_hours, 2)}</td>
      <td>${num(d.rating ?? fb.rating, 2)}</td>
      <td>${num(d.score, 4)}</td>
      <td>${d.phone_number ?? fb.phone_number ?? ""}</td>
    </tr>`;
  }).join("");
  setText("rank-count", String(ranked.length));
}

async function loadDrivers() {
  appendLog("Loading drivers...");
  const data = await fetchJson("/api/drivers");
  const drivers = Array.isArray(data) ? data : [];
  renderDrivers(drivers);
  appendLog(`Loaded ${drivers.length} drivers.`);
  return drivers;
}

async function rankDrivers(payload) {
  return fetchJson("/api/rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function startDispatch(payload) {
  return fetchJson("/api/dispatch/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function pollJob(jobId) {
  return fetchJson(`/api/jobs/${jobId}`);
}

function stopPolling() {
  if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
}

async function refreshJob(jobId) {
  const jobData = await pollJob(jobId);
  const job = jobData.job || jobData;
  setText("job-id", jobId || "-");
  setText("job-status", job.status || "idle");
  setText("latest-message", job.latest_message || "Ready");
  const candidates = jobData.candidates || [];
  renderRankedDrivers(candidates);

  // Update avatar overlay with latest message
  if (job.latest_message) {
    avatarSpeak(job.latest_message, job.status);
  }
  updateOverlayProgress(candidates, job.status);

  return jobData;
}

// ── AVATAR OVERLAY FUNCTIONS ──

function toggleOverlay() {
  const overlay = $("dispatch-overlay");
  if (overlay) overlay.classList.toggle("active");
}

function showOverlay() {
  const overlay = $("dispatch-overlay");
  if (overlay) overlay.classList.remove("active");
  setPill("pill-ranking", "done");
  setPill("pill-calling", "active");
  $("result-banner").className = "result-banner";
  $("result-banner").textContent = "";
  $("overlay-dismiss").classList.remove("show");
  $("progress-fill").style.width = "0%";
  $("progress-text").textContent = "0%";
}

function dismissOverlay() {
  const overlay = $("dispatch-overlay");
  if (overlay) overlay.classList.remove("active");
}


function setPill(id, state) {
  const el = $(id);
  if (!el) return;
  el.className = "status-pill " + state;
}

function avatarSpeak(message, jobStatus) {
  const msgEl = $("avatar-message");
  const dots = $("typing-dots");
  const wrap = $("avatar-wrap");
  const mouthOpen = $("mouth-open");
  const mouthClosed = $("mouth-closed");

  if (!msgEl) return;

  // Show typing dots briefly then reveal message
  if (dots) dots.style.display = "inline-flex";
  msgEl.childNodes[0] && (msgEl.childNodes[0].textContent = "");

  clearTimeout(state.talkTimer);

  setTimeout(() => {
    if (dots) dots.style.display = "none";
    // Set just the text node (keep dots span)
    msgEl.firstChild
      ? (msgEl.firstChild.textContent = message)
      : (msgEl.textContent = message);

    // Start talking animation
    if (wrap) wrap.classList.add("talking");
    startMouthAnimation(mouthOpen, mouthClosed);

    // Stop talking after ~3s
    state.talkTimer = setTimeout(() => {
      if (wrap) wrap.classList.remove("talking");
      stopMouthAnimation(mouthOpen, mouthClosed);
    }, 3000);

  }, 600);
}

let mouthInterval = null;

function startMouthAnimation(mouthOpen, mouthClosed) {
  if (!mouthOpen || !mouthClosed) return;
  stopMouthAnimation(mouthOpen, mouthClosed);
  let phase = 0;
  const shapes = [3, 6, 4, 7, 2, 5, 8, 3, 6, 4];
  mouthClosed.style.display = "none";
  mouthInterval = setInterval(() => {
    const ry = shapes[phase % shapes.length];
    mouthOpen.setAttribute("ry", String(ry));
    phase++;
  }, 120);
}

function stopMouthAnimation(mouthOpen, mouthClosed) {
  if (mouthInterval) { clearInterval(mouthInterval); mouthInterval = null; }
  if (mouthOpen) mouthOpen.setAttribute("ry", "0");
  if (mouthClosed) mouthClosed.style.display = "";
}

function updateOverlayProgress(candidates, jobStatus) {
  if (!candidates || candidates.length === 0) return;

  const total = candidates.length;
  const called = candidates.filter(c =>
    ["calling", "dialing", "answered_yes", "answered_no", "failed"].includes(c.status)
  ).length;

  const pct = jobStatus === "completed" || jobStatus === "failed"
    ? 100
    : Math.round((called / total) * 85);

  $("progress-fill").style.width = pct + "%";
  $("progress-text").textContent = pct + "%";

  // Update pills based on status
  if (jobStatus === "running") {
    setPill("pill-calling", "active");
    setPill("pill-listening", "active");
  }

  if (jobStatus === "completed") {
    setPill("pill-calling", "done");
    setPill("pill-listening", "done");
    setPill("pill-assigning", "done");

    const assigned = candidates.find(c => c.status === "answered_yes");
    const name = assigned?.driver_id || "a driver";

    const banner = $("result-banner");
    banner.className = "result-banner success";
    banner.textContent = `✓ Delivery assigned successfully`;

    avatarSpeak(`Assignment confirmed. Driver is on the way. All systems nominal.`, "completed");
    $("overlay-dismiss").classList.add("show");
  }

  if (jobStatus === "failed") {
    setPill("pill-calling", "failed");
    setPill("pill-listening", "failed");

    const banner = $("result-banner");
    banner.className = "result-banner failure";
    banner.textContent = `✗ No driver accepted the task`;

    avatarSpeak(`All candidates declined or were unreachable. Dispatch failed.`, "failed");
    $("overlay-dismiss").classList.add("show");
  }
}

// ── MAIN EVENT HANDLERS ──

document.addEventListener("DOMContentLoaded", async () => {
  const rankBtn = $("rank-btn");
  const dispatchBtn = $("dispatch-btn");

  async function doRank() {
    try {
      appendLog("Ranking drivers...");
      setText("latest-message", "Ranking drivers...");
      const payload = collectPayload();
      const data = await rankDrivers(payload);
      renderRankedDrivers(data.ranked || []);
      setText("latest-message", data.latest_message || "Ranking complete");
      setText("job-status", "idle");
      setText("job-id", "-");
      appendLog(`Ranking complete. Eligible drivers: ${data.eligible_count ?? 0}`);
    } catch (err) {
      console.error(err);
      appendLog(`Rank error: ${err.message}`);
      setText("latest-message", `Rank error: ${err.message}`);
    }
  }

  async function doDispatch() {
    try {
      stopPolling();
      appendLog("Starting dispatch...");
      setText("latest-message", "Starting dispatch...");

      const payload = collectPayload();
      const data = await startDispatch(payload);

      state.currentJobId = data.job_id || null;
      state.totalCandidates = data.ranked_count || 0;

      setText("job-id", state.currentJobId || "-");
      setText("job-status", data.status || "queued");
      setText("latest-message", data.latest_message || "Dispatch started");
      setText("rank-count", String(data.ranked_count ?? 0));

      appendLog(`Dispatch started. Job ID: ${state.currentJobId || "unknown"}`);

      // Show avatar overlay
      showOverlay();
const btn = $("toggle-overlay-btn");
if (btn) btn.style.display = "block";
      avatarSpeak(`Dispatch sequence initiated. Contacting ${data.ranked_count} eligible drivers now.`, "running");

      if (!state.currentJobId) return;

      await refreshJob(state.currentJobId);

      state.pollTimer = setInterval(async () => {
        try {
          const jobData = await refreshJob(state.currentJobId);
          const job = jobData.job || jobData;

          if (job.status === "completed" || job.status === "failed") {
            stopPolling();
            appendLog(`Dispatch finished: ${job.status}`);
            await loadDrivers();
          }
        } catch (err) {
          stopPolling();
          console.error(err);
          appendLog(`Polling error: ${err.message}`);
          setText("latest-message", `Polling error: ${err.message}`);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      appendLog(`Dispatch error: ${err.message}`);
      setText("latest-message", `Dispatch error: ${err.message}`);
    }
  }

  if (rankBtn) rankBtn.addEventListener("click", doRank);
  if (dispatchBtn) dispatchBtn.addEventListener("click", doDispatch);

  try {
    await loadDrivers();
    setText("job-status", "idle");
    setText("latest-message", "Ready");
  } catch (err) {
    console.error(err);
    appendLog(`Load error: ${err.message}`);
    setText("latest-message", `Load error: ${err.message}`);
  }
});