import { apiConfig } from './config.js'
import { createApp } from './createApp.js'
import { createLiveBoard } from './liveBoard/createLiveBoard.js'

const liveBoard = createLiveBoard({
  tickMs: apiConfig.simulationTickMs,
  tickMinutes: apiConfig.simulationTickMinutes,
})

const app = createApp({ liveBoard })

liveBoard.start()

app.listen(apiConfig.port, () => {
  console.log(`FleetMind API listening on http://127.0.0.1:${apiConfig.port}`)
})
