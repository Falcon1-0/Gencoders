import { apiConfig } from './config.js'
import { createIntegratedApp } from './createIntegratedApp.js'
import { createLiveBoard } from './liveBoard/createLiveBoard.js'

const liveBoard = createLiveBoard({
  tickMs: apiConfig.simulationTickMs,
  tickMinutes: apiConfig.simulationTickMinutes,
})

const app = createIntegratedApp({ liveBoard })
const portalPort = Number(process.env.PORTAL_PORT || 3000)

liveBoard.start()

app.listen(portalPort, () => {
  console.log(`FleetMind portal listening on http://127.0.0.1:${portalPort}`)
})
