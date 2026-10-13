import process from 'node:process'
import { buildApp } from './app.js'
import { loadConfig } from './config.js'

async function start() {
  const config = loadConfig()
  const app = buildApp({
    logger: {
      level: config.logLevel,
      ...(process.argv.includes('--pretty') && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: Boolean(process.stdout.isTTY),
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
      }),
    },
  })
  let shuttingDown = false

  async function shutdown(signal: NodeJS.Signals) {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info({ signal }, 'Shutting down server')

    try {
      await app.close()
    } catch (error) {
      app.log.error(error, 'Failed to close server')
      process.exitCode = 1
    }
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ host: config.host, port: config.port })
  } catch (error) {
    app.log.error(error, 'Failed to start server')
    await app.close()
    process.exitCode = 1
  }
}

start().catch((error: unknown) => {
  console.error('Backend startup failed:', error)
  process.exitCode = 1
})
