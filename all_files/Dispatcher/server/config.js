function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '')
}

export const apiConfig = {
  port: Number(process.env.API_PORT || 3001),
  ollamaBaseUrl: normalizeBaseUrl(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'),
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:8b',
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 25000),
  simulationTickMs: Number(process.env.SIMULATION_TICK_MS || 8000),
  simulationTickMinutes: Number(process.env.SIMULATION_TICK_MINUTES || 18),
}
