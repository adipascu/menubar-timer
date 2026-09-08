import { app } from 'electron'
import { spawn } from 'node:child_process'
import { randomInt, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { hostname } from 'node:os'
import { join } from 'node:path'
import { log } from './log.js'
import { run } from './shell.js'

const PORT = 47421
const SERVICE_TYPE = '_timerbar._tcp'
const SERVICE_NAME_PREFIX = 'TimerBar on'
const HEARTBEAT_MS = 15 * 1000
const MAX_BODY_BYTES = 4096

const storedCode = (file) => {
  if (!existsSync(file)) return null
  try {
    const { code } = JSON.parse(readFileSync(file, 'utf8'))
    return /^\d{6}$/.test(code) ? code : null
  } catch {
    return null
  }
}

const readCode = (file) => {
  const stored = storedCode(file)
  if (stored) return stored
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  writeFileSync(file, JSON.stringify({ code }))
  return code
}

const readBody = (request) =>
  new Promise((resolve) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY_BYTES) request.destroy()
    })
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve(null)
      }
    })
    request.on('error', () => resolve(null))
  })

const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

const event = (snapshot) => `data: ${JSON.stringify(snapshot)}\n\n`

export const createBridge = ({ snapshot, start, stop, setLabel, setCategory, onPhonesChanged }) => {
  const code = readCode(join(app.getPath('userData'), 'companion.json'))
  const serverId = randomUUID()
  const phones = new Set()
  let revision = 0
  let server = null
  let advertiser = null
  let heartbeat = null

  const stamped = () => ({ ...snapshot(), serverId, revision, at: Date.now() })

  const subscribe = (request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    response.write(event(stamped()))
    phones.add(response)
    log(`phone connected from ${request.socket.remoteAddress}, ${phones.size} listening`)
    onPhonesChanged()
    request.on('close', () => {
      phones.delete(response)
      log(`phone disconnected, ${phones.size} listening`)
      onPhonesChanged()
    })
  }

  const command = async (request, response) => {
    const body = await readBody(request)
    if (body === null) return json(response, 400, { error: 'body is not JSON' })
    const accepted = () => json(response, 200, stamped())
    if (request.url === '/timer') {
      const minutes = Number(body.minutes)
      if (!snapshot().durations.includes(minutes)) return json(response, 400, { error: 'not a timer length' })
      if (typeof body.label === 'string' && body.label.trim()) setLabel(body.label)
      log(`phone asked for ${minutes} min`)
      start(minutes)
      return accepted()
    }
    if (request.url === '/freebasing') {
      log('phone asked for Freebasing')
      stop()
      return accepted()
    }
    if (request.url === '/label') {
      if (typeof body.label !== 'string') return json(response, 400, { error: 'label is not a string' })
      log(`phone set the label to "${body.label.trim()}"`)
      setLabel(body.label)
      return accepted()
    }
    if (request.url === '/category') {
      const wanted = snapshot().categories.find(({ id }) => id === body.id)
      if (!wanted) return json(response, 400, { error: 'not a category' })
      log(`phone asked for the ${wanted.name} category`)
      setCategory(wanted.id)
      return accepted()
    }
    return json(response, 404, { error: 'unknown command' })
  }

  const handle = (request, response) => {
    if (request.headers.authorization !== `Bearer ${code}`) return json(response, 401, { error: 'pairing code' })
    if (request.method === 'GET' && request.url === '/state') return json(response, 200, stamped())
    if (request.method === 'GET' && request.url === '/events') return subscribe(request, response)
    if (request.method === 'POST') return command(request, response)
    return json(response, 404, { error: 'unknown request' })
  }

  const advertise = (port) => {
    advertiser = spawn('dns-sd', ['-R', `${SERVICE_NAME_PREFIX} ${hostname()}`, SERVICE_TYPE, '.', String(port)], {
      stdio: 'ignore',
    })
    advertiser.on('exit', (exitCode) => log(`dns-sd stopped with ${exitCode}`))
  }

  const listen = (port) => {
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && port !== 0) {
        log(`port ${PORT} is taken, picking a free one`)
        listen(0)
      } else {
        log(`companion bridge failed: ${error.message}`)
      }
    })
    server.listen(port, '0.0.0.0', () => {
      const bound = server.address().port
      advertise(bound)
      log(`companion bridge on port ${bound}, pairing code ${code}`)
    })
  }

  return {
    code,
    phones: () => phones.size,
    start: async () => {
      await run('pkill', ['-f', `dns-sd -R ${SERVICE_NAME_PREFIX}`])
      server = createServer((request, response) => {
        Promise.resolve(handle(request, response)).catch((error) => {
          log(`companion request failed: ${error.message}`)
          if (!response.headersSent) json(response, 500, { error: 'failed' })
        })
      })
      heartbeat = setInterval(() => phones.forEach((phone) => phone.write(': ping\n\n')), HEARTBEAT_MS)
      listen(PORT)
    },
    publish: () => {
      revision += 1
      const data = event(stamped())
      phones.forEach((phone) => phone.write(data))
    },
    stop: () => {
      clearInterval(heartbeat)
      heartbeat = null
      advertiser?.kill()
      advertiser = null
      phones.forEach((phone) => phone.end())
      phones.clear()
      server?.close()
      server = null
    },
  }
}
