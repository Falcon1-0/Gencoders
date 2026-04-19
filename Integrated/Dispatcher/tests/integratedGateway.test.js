import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createIntegratedApp } from '../server/createIntegratedApp.js'

function createMockLiveBoard() {
  return {
    getSnapshot() {
      return {
        snapshotVersion: 7,
        clock: '2026-04-19T08:00:00.000Z',
        activeLoad: { id: 'LD-7' },
        queuedLoads: [],
        drivers: [],
        activity: [],
      }
    },
    subscribe() {
      return () => {}
    },
  }
}

function createTempPortalFiles() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fleetmind-integrated-'))
  const dispatcherDistDir = path.join(tempRoot, 'dispatcher')
  const driverDistDir = path.join(tempRoot, 'driver')
  const loginPagePath = path.join(tempRoot, 'login.html')

  fs.mkdirSync(dispatcherDistDir, { recursive: true })
  fs.mkdirSync(driverDistDir, { recursive: true })
  fs.writeFileSync(loginPagePath, '<!doctype html><title>Portal</title><h1>FleetMind Access Portal</h1>')
  fs.writeFileSync(path.join(dispatcherDistDir, 'index.html'), '<!doctype html><h1>Integrated Dispatcher</h1>')
  fs.writeFileSync(path.join(driverDistDir, 'index.html'), '<!doctype html><h1>DCH Driver Page</h1>')

  return {
    tempRoot,
    dispatcherDistDir,
    driverDistDir,
    loginPagePath,
  }
}

const tempRoots = []

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

describe('integrated gateway', () => {
  it('serves the login page when no session exists', async () => {
    const files = createTempPortalFiles()
    tempRoots.push(files.tempRoot)

    const app = createIntegratedApp({
      liveBoard: createMockLiveBoard(),
      paths: files,
    })

    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(response.text).toContain('FleetMind Access Portal')
  })

  it('authenticates admin users and routes them to the integrated dispatcher', async () => {
    const files = createTempPortalFiles()
    tempRoots.push(files.tempRoot)

    const app = createIntegratedApp({
      liveBoard: createMockLiveBoard(),
      paths: files,
    })

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ role: 'admin', username: 'admin', password: 'admin123' })

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.body.redirectTo).toBe('/integrated/')
    expect(loginResponse.headers['set-cookie'][0]).toContain('fleetmind_role=admin')

    const integratedResponse = await request(app)
      .get('/integrated/')
      .set('Cookie', loginResponse.headers['set-cookie'])

    expect(integratedResponse.status).toBe(200)
    expect(integratedResponse.text).toContain('Integrated Dispatcher')

    const driverResponse = await request(app)
      .get('/driver/')
      .set('Cookie', loginResponse.headers['set-cookie'])

    expect(driverResponse.status).toBe(302)
    expect(driverResponse.headers.location).toBe('/')
  })

  it('authenticates driver users and routes them to the DCH driver page', async () => {
    const files = createTempPortalFiles()
    tempRoots.push(files.tempRoot)

    const app = createIntegratedApp({
      liveBoard: createMockLiveBoard(),
      paths: files,
    })

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ role: 'driver', username: 'driver', password: 'driver123' })

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.body.redirectTo).toBe('/driver/')
    expect(loginResponse.headers['set-cookie'][0]).toContain('fleetmind_role=driver')

    const driverResponse = await request(app)
      .get('/driver/')
      .set('Cookie', loginResponse.headers['set-cookie'])

    expect(driverResponse.status).toBe(200)
    expect(driverResponse.text).toContain('DCH Driver Page')
  })
})
