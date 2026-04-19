import express from 'express'
import { decideDispatch } from './dispatch/decisionService.js'
import { checkOllamaHealth } from './dispatch/ollamaClient.js'

export function createApp({ liveBoard, services = {} }) {
  const app = express()
  const dispatchDecider = services.decideDispatch || decideDispatch
  const healthCheck = services.checkOllamaHealth || checkOllamaHealth

  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', async (_request, response) => {
    const health = await healthCheck()

    response.json({
      ok: true,
      liveBoard: {
        snapshotVersion: liveBoard.getSnapshot().snapshotVersion,
      },
      ollama: health,
    })
  })

  app.get('/api/live-board/state', (_request, response) => {
    response.json(liveBoard.getSnapshot())
  })

  app.get('/api/live-board/events', (request, response) => {
    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-cache, no-transform')
    response.setHeader('Connection', 'keep-alive')
    response.flushHeaders?.()

    const sendSnapshot = (snapshot) => {
      response.write(`event: snapshot\n`)
      response.write(`data: ${JSON.stringify(snapshot)}\n\n`)
    }

    sendSnapshot(liveBoard.getSnapshot())

    const unsubscribe = liveBoard.subscribe(sendSnapshot)

    const heartbeat = setInterval(() => {
      response.write(`event: heartbeat\ndata: {"ok":true}\n\n`)
    }, 15000)

    request.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
      response.end()
    })
  })

  app.post('/api/dispatch/decision', async (request, response) => {
    try {
      const decision = await dispatchDecider(request.body || {})
      response.json(decision)
    } catch (error) {
      response.status(500).json({
        error: error.message,
        fallbackUsed: true,
        provider: 'heuristic',
        model: 'deterministic',
      })
    }
  })

  return app
}
