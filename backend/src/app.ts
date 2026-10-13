import Fastify from 'fastify'
import type { FastifyServerOptions } from 'fastify'

export function buildApp(options: FastifyServerOptions = {}) {
  return Fastify({ logger: true, ...options })
}
