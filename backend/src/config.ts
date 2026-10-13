import process, { loadEnvFile } from 'node:process'

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

export function loadConfig() {
  try {
    loadEnvFile('.env')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  const host = (process.env.HOST ?? '127.0.0.1').trim()
  const portValue = process.env.PORT ?? '3000'
  const port = Number(portValue)
  const logLevel = process.env.LOG_LEVEL ?? 'info'

  if (!host) {
    throw new Error('HOST must not be empty')
  }

  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  if (!logLevels.some((level) => level === logLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${logLevels.join(', ')}`)
  }

  return { host, port, logLevel }
}
