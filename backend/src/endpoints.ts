import type { FastifyPluginAsync } from 'fastify'
import type { Pool } from 'pg'

export const endpoints: FastifyPluginAsync<{ db: Pool }> = async (app, { db }) => {
  // Q1: Time & Trend Analysis. Returns the selected date grain plus a total row.
  app.get('/time-trend', async (request, reply) => {
    try {
      const {
        start_date,
        end_date,
        granularity = 'month'
      } = request.query as {
        start_date?: string
        end_date?: string
        granularity?: string
      }

      const isDate = (value?: string): boolean => {
        if (!value) return true
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const date = new Date(`${value}T00:00:00Z`)
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
      }

      if (
        !['year', 'quarter', 'month', 'day'].includes(granularity) ||
        !isDate(start_date) ||
        !isDate(end_date) ||
        (start_date && end_date && start_date > end_date)
      ) {
        return reply.code(400).send({
          error: 'Use granularity year, quarter, month, or day and a valid YYYY-MM-DD date range.'
        })
      }

      const result = await db.query(`
        WITH filtered AS (
          SELECT d.year_number, d.quarter_number, d.month_number,
                 d.day_number,
                 f.service_key, f.station_key, f.stop_count,
                 f.arrival_delay, f.arrival_cancelled,
                 f.departure_delay, f.departure_cancelled
          FROM dutch_railway_dw.fact_station_stop f
          JOIN dutch_railway_dw.dim_date d ON d.date_key = f.date_key
          WHERE ($1::date IS NULL OR d.full_date >= $1::date)
            AND ($2::date IS NULL OR d.full_date <= $2::date)
        ), rolled AS (
          SELECT year_number, quarter_number, month_number, day_number,
                 GROUPING(year_number) AS g_year,
                 GROUPING(quarter_number) AS g_quarter,
                 GROUPING(month_number) AS g_month,
                 GROUPING(day_number) AS g_day,
                 SUM(stop_count) AS stop_count,
                 COUNT(DISTINCT station_key) AS distinct_stations,
                 COUNT(DISTINCT service_key) AS distinct_services,
                 COUNT(*) FILTER (WHERE departure_cancelled IS TRUE) AS cancelled_stops,
                 COUNT(*) FILTER (WHERE departure_cancelled IS NOT NULL) AS known_departure_stops,
                 COUNT(DISTINCT service_key) FILTER (WHERE departure_cancelled IS TRUE) AS cancelled_services,
                 COUNT(DISTINCT service_key) FILTER (WHERE departure_cancelled IS NOT NULL) AS known_services,
                 COUNT(*) FILTER (WHERE arrival_delay IS NOT NULL AND arrival_cancelled IS NOT TRUE) AS valid_arrival_observations,
                 COUNT(*) FILTER (WHERE departure_delay IS NOT NULL AND departure_cancelled IS NOT TRUE) AS valid_departure_observations,
                 ROUND(AVG(arrival_delay) FILTER (WHERE arrival_delay IS NOT NULL AND arrival_cancelled IS NOT TRUE), 2) AS average_arrival_delay,
                 ROUND(AVG(departure_delay) FILTER (WHERE departure_delay IS NOT NULL AND departure_cancelled IS NOT TRUE), 2) AS average_departure_delay
          FROM filtered
          GROUP BY ROLLUP (year_number, quarter_number, month_number, day_number)
        ), selected AS (
          SELECT *,
            CASE
              WHEN g_year = 1 THEN 'total'
              WHEN g_quarter = 1 THEN 'year'
              WHEN g_month = 1 THEN 'quarter'
              WHEN g_day = 1 THEN 'month'
              ELSE 'day'
            END AS period_granularity,
            CASE
              WHEN g_year = 1 THEN 'all'
              WHEN g_quarter = 1 THEN year_number::text
              WHEN g_month = 1 THEN year_number::text || '-Q' || quarter_number::text
              WHEN g_day = 1 THEN year_number::text || '-' || LPAD(month_number::text, 2, '0')
              ELSE MAKE_DATE(year_number, month_number, day_number)::text
            END AS period_key,
            CASE
              WHEN g_year = 1 THEN 'All selected dates'
              WHEN g_quarter = 1 THEN year_number::text
              WHEN g_month = 1 THEN year_number::text || ' Q' || quarter_number::text
              WHEN g_day = 1 THEN TO_CHAR(MAKE_DATE(year_number, month_number, 1), 'FMMonth YYYY')
              ELSE TO_CHAR(MAKE_DATE(year_number, month_number, day_number), 'FMMonth DD, YYYY')
            END AS period_label
          FROM rolled
        ), chosen AS (
          SELECT * FROM selected
          WHERE period_granularity IN ($3, 'total')
        ), with_lag AS (
          SELECT *,
            LAG(average_departure_delay) OVER (PARTITION BY period_granularity ORDER BY year_number, quarter_number, month_number, day_number) AS previous_period_average_departure_delay,
            LAG(cancelled_stops::numeric / NULLIF(known_departure_stops, 0)) OVER (PARTITION BY period_granularity ORDER BY year_number, quarter_number, month_number, day_number) AS previous_period_cancellation_rate
          FROM chosen
        )
        SELECT period_key, period_label, period_granularity,
               stop_count, distinct_stations, distinct_services,
               cancelled_services,
               ROUND(100.0 * cancelled_services / NULLIF(known_services, 0), 2) AS service_cancellation_rate,
               ROUND(100.0 * cancelled_stops / NULLIF(known_departure_stops, 0), 2) AS cancellation_rate,
               valid_arrival_observations, valid_departure_observations,
               average_arrival_delay, average_departure_delay,
               previous_period_average_departure_delay,
               ROUND(100.0 * previous_period_cancellation_rate, 2) AS previous_period_cancellation_rate
        FROM with_lag
        ORDER BY (period_granularity = 'total'), year_number NULLS LAST,
                 quarter_number NULLS LAST, month_number NULLS LAST, day_number NULLS LAST
      `, [start_date || null, end_date || null, granularity])

      return result.rows
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })

  // Q5: Pivot service volume, delay, and cancellation by a row and column dimension.
  app.get('/olap-pivot', async (request, reply) => {
    try {
      const {
        row_dimension = 'operator',
        column_dimension = 'month',
        start_date,
        end_date,
        operator,
        service_type
      } = request.query as {
        row_dimension?: string
        column_dimension?: string
        start_date?: string
        end_date?: string
        operator?: string
        service_type?: string
      }

      const isDate = (value?: string): boolean => {
        if (!value) return true
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const date = new Date(`${value}T00:00:00Z`)
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
      }

      if (
        !['operator', 'station'].includes(row_dimension) ||
        !['month', 'quarter', 'service_type'].includes(column_dimension) ||
        !isDate(start_date) ||
        !isDate(end_date) ||
        (start_date && end_date && start_date > end_date)
      ) {
        return reply.code(400).send({
          error: 'Invalid pivot dimensions or date range.'
        })
      }

      const result = await db.query(`
        WITH filtered AS (
          SELECT
            CASE WHEN $1 = 'operator'
              THEN COALESCE(sv.company, '(Unknown operator)')
              ELSE COALESCE(st.station_code, '(Unknown station)')
            END AS row_key,
            CASE WHEN $1 = 'operator'
              THEN COALESCE(sv.company, '(Unknown operator)')
              ELSE COALESCE(st.station_name, st.station_code, '(Unknown station)')
            END AS row_label,
            CASE
              WHEN $2 = 'month' THEN TO_CHAR(d.full_date, 'YYYY-MM')
              WHEN $2 = 'quarter' THEN d.year_number::text || '-Q' || d.quarter_number::text
              ELSE COALESCE(sv.service_type, '(Unknown service type)')
            END AS column_key,
            CASE
              WHEN $2 = 'month' THEN TO_CHAR(d.full_date, 'Mon YYYY')
              WHEN $2 = 'quarter' THEN d.year_number::text || ' Q' || d.quarter_number::text
              ELSE COALESCE(sv.service_type, '(Unknown service type)')
            END AS column_label,
            f.service_key, f.stop_count, f.departure_delay, f.departure_cancelled
          FROM dutch_railway_dw.fact_station_stop f
          JOIN dutch_railway_dw.dim_date d ON d.date_key = f.date_key
          JOIN dutch_railway_dw.dim_station st ON st.station_key = f.station_key
          JOIN dutch_railway_dw.dim_service sv ON sv.service_key = f.service_key
          WHERE ($3::date IS NULL OR d.full_date >= $3::date)
            AND ($4::date IS NULL OR d.full_date <= $4::date)
            AND ($5::text IS NULL OR sv.company = $5::text)
            AND ($6::text IS NULL OR sv.service_type = $6::text)
        ), grouped AS (
          SELECT row_key, MAX(row_label) AS row_label,
                 column_key, MAX(column_label) AS column_label,
                 GROUPING(row_key) AS g_row,
                 GROUPING(column_key) AS g_column,
                 SUM(stop_count) AS stop_count,
                 COUNT(DISTINCT service_key) AS distinct_services,
                 COUNT(*) FILTER (WHERE departure_cancelled IS TRUE) AS cancelled_stops,
                 COUNT(*) FILTER (WHERE departure_cancelled IS NOT NULL) AS known_departure_stops,
                 ROUND(AVG(departure_delay) FILTER (
                   WHERE departure_delay IS NOT NULL AND departure_cancelled IS NOT TRUE
                 ), 2) AS average_departure_delay
          FROM filtered
          GROUP BY GROUPING SETS (
            (row_key, column_key),
            (row_key),
            (column_key),
            ()
          )
        )
        SELECT
          CASE WHEN g_row = 1 THEN NULL ELSE row_key END AS row_key,
          CASE WHEN g_row = 1 THEN 'Grand Total' ELSE MAX(row_label) END AS row_label,
          CASE WHEN g_column = 1 THEN NULL ELSE column_key END AS column_key,
          CASE WHEN g_column = 1 THEN 'Total' ELSE MAX(column_label) END AS column_label,
          CASE
            WHEN g_row = 1 AND g_column = 1 THEN 'grand_total'
            WHEN g_column = 1 THEN 'row_total'
            WHEN g_row = 1 THEN 'column_total'
            ELSE 'cell'
          END AS grouping_level,
          SUM(stop_count) AS stop_count,
          MAX(distinct_services) AS distinct_services,
          MAX(average_departure_delay) AS average_departure_delay,
          MAX(cancelled_stops) AS cancelled_stops,
          MAX(known_departure_stops) AS known_departure_stops,
          ROUND(100.0 * MAX(cancelled_stops) / NULLIF(MAX(known_departure_stops), 0), 2) AS cancellation_rate
        FROM grouped
        GROUP BY row_key, column_key, g_row, g_column
        ORDER BY g_row, row_key NULLS LAST, g_column, column_key NULLS LAST
      `, [row_dimension, column_dimension, start_date || null, end_date || null,
        operator || null, service_type || null])

      return result.rows
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })

  // Q2__-
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
                DATE '2025-12-01' AS start_date,
                DATE '2025-12-31' AS end_date
          UNION ALL
          SELECT 'previous', DATE '2025-11-01', DATE '2025-11-30'
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
      const { year = '2025' } = request.query as { year?: string }
      if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100) {
        return reply.code(400).send({ error: 'year must be between 1900 and 2100.' })
      }

      const result = await db.query(`
        WITH grouped AS (
          SELECT sv.company AS group_value,
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
          WHERE d.year_number = 2025
          GROUP BY sv.company
        )
        SELECT group_value, average_departure_delay, distinct_services,
               cancelled_services, valid_observations,
               ROUND(100.0 * cancelled_services / NULLIF(distinct_services, 0), 2)
                 AS cancellation_rate
        FROM grouped
        ORDER BY average_departure_delay DESC NULLS LAST, group_value
      `, [year])
      return result.rows
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Database query failed' })
    }
  })

  // Q4
  app.get('/olap-dice', async (request, reply) => {
    try {
      const {
        operators,
        service_types,
        station_ids,
        start_date,
        end_date
      } = request.query as {
        operators?: string
        service_types?: string
        station_ids?: string
        start_date?: string
        end_date?: string
      }

      const parseList = (value?: string): string[] | null => {
        const values = value
          ?.split(',')
          .map(value => value.trim())
          .filter(Boolean)

        return values?.length ? values : null
      }

      const parseStationIds = (
        value?: string
      ): number[] | null | undefined => {
        if (!value?.trim()) return null

        const parts = value.split(',').map(v => v.trim())

        if (
          parts.some(
            v =>
              !/^[1-9]\d*$/.test(v) ||
              !Number.isSafeInteger(Number(v))
          )
        ) {
          return undefined
        }

        return [...new Set(parts.map(Number))]
      }

      const isDate = (value?: string): boolean => {
        if (!value) return true
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

        const date = new Date(`${value}T00:00:00Z`)

        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        )
      }

      if (
        !isDate(start_date) ||
        !isDate(end_date) ||
        (start_date && end_date && start_date > end_date)
      ) {
        return reply.code(400).send({
          error:
            'Invalid date range. Use valid YYYY-MM-DD dates and ensure start_date is not after end_date.'
        })
      }

      const stationIds = parseStationIds(station_ids)

      if (stationIds === undefined) {
        return reply.code(400).send({
          error:
            'Invalid station_ids. Supply comma-separated positive numeric station_key values.'
        })
      }

      const result = await db.query(`
        WITH filtered_stops AS (
          SELECT
            sv.company AS operator,
            sv.service_type,
            sv.service_key,
            st.station_key,
            st.station_code,
            st.station_name,
            f.stop_count,
            f.departure_delay,
            f.departure_cancelled
          FROM dutch_railway_dw.fact_station_stop f
          JOIN dutch_railway_dw.dim_service sv
            ON sv.service_key = f.service_key
          JOIN dutch_railway_dw.dim_station st
            ON st.station_key = f.station_key
          JOIN dutch_railway_dw.dim_date d
            ON d.date_key = f.date_key
          WHERE
            ($1::text[] IS NULL
              OR sv.company = ANY($1::text[]))
            AND ($2::text[] IS NULL
              OR sv.service_type = ANY($2::text[]))
            AND ($3::bigint[] IS NULL
              OR st.station_key = ANY($3::bigint[]))
            AND ($4::date IS NULL
              OR d.full_date >= $4::date)
            AND ($5::date IS NULL
              OR d.full_date <= $5::date)
        ),

        grouped AS (
          SELECT
            operator,
            service_type,
            station_key,
            station_code,
            station_name,

            GROUPING(operator) AS g_operator,
            GROUPING(service_type) AS g_service_type,
            GROUPING(station_key) AS g_station,

            SUM(stop_count) AS total_stops,

            COUNT(DISTINCT service_key)
              AS distinct_services,

            COUNT(DISTINCT service_key) FILTER (
              WHERE departure_cancelled IS NOT NULL
            ) AS known_services,

            COUNT(DISTINCT service_key) FILTER (
              WHERE departure_cancelled IS TRUE
            ) AS cancelled_services,

            COUNT(*) FILTER (
              WHERE departure_cancelled IS TRUE
            ) AS cancelled_departures,

            COUNT(*) FILTER (
              WHERE departure_cancelled IS NOT NULL
            ) AS known_departures,

            ROUND(
              AVG(departure_delay) FILTER (
                WHERE departure_cancelled IS NOT TRUE
              ),
              2
            ) AS average_departure_delay,

            COUNT(*) FILTER (
              WHERE departure_delay IS NOT NULL
                AND departure_cancelled IS NOT TRUE
            ) AS valid_observations

          FROM filtered_stops

          GROUP BY GROUPING SETS (
            (
              operator,
              service_type,
              station_key,
              station_code,
              station_name
            ),
            (operator, service_type),
            (operator),
            ()
          )
        )

        SELECT
          operator,
          service_type,
          station_key,
          station_code,
          station_name,

          CASE
            WHEN g_operator = 1
              THEN 'Grand Total'
            WHEN g_service_type = 1
              THEN 'Operator Summary'
            WHEN g_station = 1
              THEN 'Operator-Service Summary'
            ELSE 'Station Detail'
          END AS grouping_level,

          total_stops,
          distinct_services,
          known_services,
          cancelled_services,

          ROUND(
            100.0 * cancelled_services
            / NULLIF(known_services, 0),
            2
          ) AS service_cancellation_rate,

          cancelled_departures,
          known_departures,

          ROUND(
            100.0 * cancelled_departures
            / NULLIF(known_departures, 0),
            2
          ) AS cancellation_rate,

          ROUND(
            100.0 * cancelled_departures
            / NULLIF(known_departures, 0),
            2
          ) AS departure_cancellation_rate,

          average_departure_delay,
          valid_observations

        FROM grouped

        ORDER BY
          g_operator,
          operator NULLS LAST,
          g_service_type,
          service_type NULLS LAST,
          g_station,
          station_code NULLS LAST
      `, [
        parseList(operators),
        parseList(service_types),
        stationIds,
        start_date || null,
        end_date || null
      ])

      return result.rows
    } catch (error) {
      request.log.error(error)

      return reply.code(500).send({
        error: 'Database query failed'
      })
    }
  })
}
