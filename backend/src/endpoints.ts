import type { FastifyPluginAsync } from 'fastify'
import type { Pool } from 'pg'

export const endpoints: FastifyPluginAsync<{ db: Pool }> = async (app, { db }) => {
  app.get('/station-delays', async (request, reply) => {
    try {
      const result = await db.query(`
        WITH station_delays AS (
          SELECT station_key,
                 ROUND(AVG(arrival_delay) FILTER (
                   WHERE arrival_cancelled IS NOT TRUE
                 ), 2) AS average_arrival_delay,
                 COUNT(*) FILTER (
                   WHERE arrival_delay > 0 AND arrival_cancelled IS NOT TRUE
                 ) AS delayed_arrivals,
                 COUNT(*) AS stop_count
          FROM dutch_railway_dw.fact_station_stop
          GROUP BY station_key
        )
        SELECT s.station_code, s.station_name,
               d.average_arrival_delay, d.delayed_arrivals, d.stop_count
        FROM station_delays d
        JOIN dutch_railway_dw.dim_station s ON s.station_key = d.station_key
        ORDER BY d.delayed_arrivals DESC,
                 d.average_arrival_delay DESC NULLS LAST, s.station_code
        LIMIT $1
      `, [10])
      return result.rows
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })

  app.get('/peak-delays', async (request, reply) => {
    try {
      const result = await db.query(`
        WITH hourly_totals AS (
          SELECT EXTRACT(HOUR FROM arrival_time)::INTEGER
                   AS arrival_hour,
                 SUM(arrival_delay) AS total_arrival_delay,
                 COUNT(*) FILTER (WHERE arrival_delay > 0) AS delayed_arrivals,
                 COUNT(*) AS observed_arrivals
          FROM dutch_railway_dw.fact_station_stop
          WHERE arrival_time IS NOT NULL
            AND arrival_delay IS NOT NULL
            AND arrival_cancelled IS NOT TRUE
          GROUP BY arrival_hour
        )
        SELECT arrival_hour,
               ROUND(total_arrival_delay / observed_arrivals, 2) AS average_arrival_delay,
               delayed_arrivals, observed_arrivals
        FROM hourly_totals
        ORDER BY average_arrival_delay DESC, arrival_hour
      `)
      return result.rows
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })
}
