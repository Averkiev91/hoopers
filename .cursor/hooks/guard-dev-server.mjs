#!/usr/bin/env node
import net from 'node:net'

const PORT = 5173

async function main() {
  const raw = await readStdin()
  const command = readCommand(raw)
  if (!/\bnpm\s+run\s+dev\b/.test(command)) {
    respond({ permission: 'allow' })
    return
  }

  if (!(await portOpen(PORT))) {
    respond({ permission: 'allow' })
    return
  }

  respond({
    permission: 'ask',
    user_message: 'Порт 5173 уже занят. Остановите текущий сервер, прежде чем запускать второй.',
    agent_message: 'Хук hoopers: npm run dev ждёт подтверждения, потому что 127.0.0.1:5173 уже слушает.',
  })
}

function readCommand(raw) {
  try {
    const input = JSON.parse(raw)
    return typeof input.command === 'string' ? input.command : ''
  } catch {
    return ''
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = []
    process.stdin.on('data', (chunk) => chunks.push(chunk))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    process.stdin.on('error', reject)
  })
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const done = (open) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(400)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

function respond(payload) {
  process.stdout.write(JSON.stringify(payload))
}

main().catch(() => {
  respond({ permission: 'allow' })
})
