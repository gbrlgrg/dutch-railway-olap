import Fastify from 'fastify'
import process from 'node:process'
import { Pool } from 'pg'
import { endpoints } from './endpoints.js'

const host = (process.env.HOST ?? '127.0.0.1').trim()
const portValue = process.env.PORT ?? '3000'
const port = Number(portValue)

if (!host) throw new Error('HOST must not be empty')
if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

export const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } })
const db = new Pool({
  database: process.env.PGDATABASE ?? process.env.POSTGRES_DB,
  user: process.env.PGUSER ?? process.env.POSTGRES_USER,
  password: process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD,
})
db.on('connect', (client) => {
  client
    .query("SET work_mem = '256MB'; SET max_parallel_workers_per_gather = 4;")
    .catch((error: unknown) => app.log.error(error))
})
db.on('error', (error) => app.log.error(error))
app.addHook('onClose', async () => db.end())
app.register(endpoints, { db })

let closing = false
function shutdown() {
  if (closing) return
  closing = true
  app.close().catch((error: unknown) => {
    app.log.error(error)
    process.exitCode = 1
  })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

try {
  await app.listen({ host, port })
} catch (error) {
  app.log.error(error)
  await app.close()
  process.exitCode = 1
}
