import type { FastifyPluginAsync } from 'fastify'
import type { Pool } from 'pg'

export const endpoints: FastifyPluginAsync<{ db: Pool }> = async (app, { db }) => {
  // Q2
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

  // Q2
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

  // Q0
  app.get('/overview-kpis', async (request, reply) => {
    try {
      const result = await db.query(`
        WITH periods AS (
          SELECT 'current' AS period,
                DATE '2024-01-01' AS start_date,
                DATE '2024-01-31' AS end_date
          UNION ALL
          SELECT 'previous', DATE '2023-12-01', DATE '2023-12-31'
        ),
        period_kpis AS (
          SELECT p.period,
                 ROUND(AVG(f.departure_delay) FILTER (
                  WHERE f.departure_cancelled IS NOT TRUE
                ), 2) AS average_departure_delay,
                COUNT(DISTINCT f.service_key) AS distinct_services,
                COUNT(DISTINCT f.service_key) FILTER (
                  WHERE f.departure_cancelled IS TRUE
                ) AS cancelled_services,
                COUNT(DISTINCT f.station_key) AS stations_observed
          FROM periods p
            LEFT JOIN dutch_railway_dw.dim_date d
              ON d.full_date BETWEEN p.start_date AND p.end_date
            LEFT JOIN dutch_railway_dw.fact_station_stop f
              ON f.date_key = d.date_key
            GROUP BY p.period
          )
          SELECT period, average_departure_delay, distinct_services,
              cancelled_services, stations_observed,
              ROUND(100.0 * cancelled_services / NULLIF(distinct_services, 0), 2)
                AS cancellation_rate
        FROM period_kpis
      `)
      return {
        current: result.rows.find(row => row.period === 'current'),
        previous: result.rows.find(row => row.period === 'previous')
      }
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })

  // Q3
  app.get('/olap-slice', async (request, reply) => {
    try {
      const result = await db.query(`
        WITH grouped AS (
          SELECT sv.operator AS group_value,
                 ROUND(AVG(f.departure_delay) FILTER (
                   WHERE f.departure_cancelled IS NOT TRUE
                 ), 2) AS average_departure_delay,
                 COUNT(DISTINCT f.service_key) AS distinct_services,
                 COUNT(DISTINCT f.service_key) FILTER (
                   WHERE f.departure_cancelled IS TRUE
                 ) AS cancelled_services,
                 COUNT(*) FILTER (
                   WHERE f.departure_delay IS NOT NULL
                     AND f.departure_cancelled IS NOT TRUE
                 ) AS valid_observations
          FROM dutch_railway_dw.fact_station_stop f
          JOIN dutch_railway_dw.dim_date d ON d.date_key = f.date_key
          JOIN dutch_railway_dw.dim_service sv ON sv.service_key = f.service_key
          WHERE d.year = 2024
          GROUP BY sv.operator
        )
        SELECT group_value, average_departure_delay, distinct_services,
               cancelled_services, valid_observations,
               ROUND(100.0 * cancelled_services / NULLIF(distinct_services, 0), 2)
                 AS cancellation_rate
        FROM grouped
        ORDER BY average_departure_delay DESC NULLS LAST, group_value
      `)
      return result.rows
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })
}
