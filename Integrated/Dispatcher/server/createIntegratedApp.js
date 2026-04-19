import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './createApp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SESSION_COOKIE = 'fleetmind_role'
const LOGIN_CREDENTIALS = {
  admin: {
    username: 'admin',
    password: 'admin123',
    redirectTo: '/integrated/',
  },
  driver: {
    username: 'driver',
    password: 'driver123',
    redirectTo: '/driver/',
  },
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null

  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!entry) return null
  return decodeURIComponent(entry.slice(name.length + 1))
}

function getSessionRole(request) {
  const value = getCookieValue(request.headers.cookie, SESSION_COOKIE)
  return value === 'admin' || value === 'driver' ? value : null
}

function buildSessionCookie(role) {
  return `${SESSION_COOKIE}=${encodeURIComponent(role)}; Path=/; HttpOnly; SameSite=Lax`
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

function createRoleGuard(expectedRole) {
  return function roleGuard(request, response, next) {
    const currentRole = getSessionRole(request)
    if (currentRole === expectedRole) {
      return next()
    }

    return response.redirect('/')
  }
}

function sendAppEntry(response, distDir, appName) {
  const entryFile = path.join(distDir, 'index.html')
  if (!fs.existsSync(entryFile)) {
    response.status(503).type('text/plain').send(
      `${appName} is not built yet. Run the integrated frontend build before starting the portal.`,
    )
    return
  }

  response.sendFile(entryFile)
}

export function createIntegratedApp({ liveBoard, services = {}, paths = {} }) {
  const app = createApp({ liveBoard, services })
  const dispatcherDistDir = paths.dispatcherDistDir || path.resolve(__dirname, '../dist')
  const driverDistDir = paths.driverDistDir || path.resolve(__dirname, '../../Driver/dist')
  const loginPagePath = paths.loginPagePath || path.resolve(__dirname, 'portal/index.html')
  const requireAdmin = createRoleGuard('admin')
  const requireDriver = createRoleGuard('driver')

  app.disable('x-powered-by')

  app.get('/', (request, response) => {
    const role = getSessionRole(request)

    if (role === 'admin') {
      response.redirect('/integrated/')
      return
    }

    if (role === 'driver') {
      response.redirect('/driver/')
      return
    }

    response.sendFile(loginPagePath)
  })

  app.get('/login', (_request, response) => {
    response.sendFile(loginPagePath)
  })

  app.get('/auth/session', (request, response) => {
    response.json({ role: getSessionRole(request) })
  })

  app.post('/auth/login', (request, response) => {
    const role = typeof request.body?.role === 'string' ? request.body.role.toLowerCase() : ''
    const username = String(request.body?.username || '').trim()
    const password = String(request.body?.password || '').trim()
    const credentials = LOGIN_CREDENTIALS[role]

    if (!credentials || credentials.username !== username || credentials.password !== password) {
      response.status(401).json({
        ok: false,
        message: 'Invalid credentials. Please try again.',
      })
      return
    }

    response.setHeader('Set-Cookie', buildSessionCookie(role))
    response.json({
      ok: true,
      role,
      redirectTo: credentials.redirectTo,
    })
  })

  app.post('/auth/logout', (_request, response) => {
    response.setHeader('Set-Cookie', clearSessionCookie())
    response.json({
      ok: true,
      redirectTo: '/',
    })
  })

  app.get('/logout', (_request, response) => {
    response.setHeader('Set-Cookie', clearSessionCookie())
    response.redirect('/')
  })

  app.use('/integrated', requireAdmin, expressStatic(dispatcherDistDir))
  app.get(/^\/integrated(?:\/.*)?$/, requireAdmin, (_request, response) => {
    sendAppEntry(response, dispatcherDistDir, 'The integrated dispatcher app')
  })

  app.use('/driver', requireDriver, expressStatic(driverDistDir))
  app.get(/^\/driver(?:\/.*)?$/, requireDriver, (_request, response) => {
    sendAppEntry(response, driverDistDir, 'The driver portal')
  })

  return app
}

function expressStatic(directory) {
  return express.static(directory, { index: false })
}
