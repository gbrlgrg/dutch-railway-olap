import assert from 'node:assert/strict'

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000'
const results = []

async function get(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, baseUrl))
  const body = await response.json()
  assert.equal(
    response.status,
    expectedStatus,
    `${path}: expected HTTP ${expectedStatus}, got ${response.status}: ${JSON.stringify(body)}`
  )
  return body
}

async function test(name, fn) {
  const started = performance.now()
  try {
    await fn()
    results.push({ name, status: 'PASS', ms: Math.round(performance.now() - started) })
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      ms: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

const q = (params) => new URLSearchParams(params).toString()
const dateRange = { start_date: '2025-01-01', end_date: '2025-01-07' }
const asNumber = (value) => Number(value)

for (const granularity of ['year', 'quarter', 'month', 'day']) {
  await test(`Q1 time-trend roll-up: ${granularity}`, async () => {
    const rows = await get(`/time-trend?${q({ ...dateRange, granularity })}`)
    assert.ok(Array.isArray(rows) && rows.length >= 2, 'expected detail rows and total row')
    const totals = rows.filter((row) => row.period_granularity === 'total')
    const details = rows.filter((row) => row.period_granularity !== 'total')
    assert.equal(totals.length, 1, 'expected exactly one total row')
    assert.ok(details.length > 0, 'expected at least one row at the requested grain')
    assert.ok(details.every((row) => row.period_granularity === granularity))
    assert.equal(
      details.reduce((sum, row) => sum + asNumber(row.stop_count), 0),
      asNumber(totals[0].stop_count),
      'detail stop counts should sum to the roll-up total'
    )
  })
}

const pivotCases = [
  ['operator by month', { row_dimension: 'operator', column_dimension: 'month', ...dateRange }],
  ['station by service type', { row_dimension: 'station', column_dimension: 'service_type', ...dateRange }],
  ['operator by quarter with operator filter', {
    row_dimension: 'operator', column_dimension: 'quarter', operator: 'NS', ...dateRange
  }],
  ['operator by service type with type filter', {
    row_dimension: 'operator', column_dimension: 'service_type', service_type: 'Intercity', ...dateRange
  }]
]

for (const [name, params] of pivotCases) {
  await test(`Q5 pivot: ${name}`, async () => {
    const rows = await get(`/olap-pivot?${q(params)}`)
    assert.ok(Array.isArray(rows) && rows.length > 0, 'expected pivot cells and totals')
    const levels = new Set(rows.map((row) => row.grouping_level))
    for (const level of ['cell', 'row_total', 'column_total', 'grand_total']) {
      assert.ok(levels.has(level), `expected ${level} rows`)
    }
    const grandTotal = rows.find((row) => row.grouping_level === 'grand_total')
    assert.ok(asNumber(grandTotal.stop_count) > 0, 'expected non-zero grand total')
  })
}

await test('Q5 rejects an unsupported dimension', async () => {
  const result = await get('/olap-pivot?row_dimension=company&column_dimension=month', 400)
  assert.ok(result.error)
})

for (const repetition of [1, 2]) {
  await test(`Q2 station-delay ranking repeat ${repetition}`, async () => {
    // This endpoint currently has no query parameters, so check repeatability.
    const rows = await get('/station-delays')
    assert.ok(Array.isArray(rows) && rows.length > 0 && rows.length <= 10)
    assert.ok(rows.every((row) => Number(row.stop_count) >= 0))
  })
}

for (const repetition of [1, 2]) {
  await test(`Q2 peak-delay report repeat ${repetition}`, async () => {
    const rows = await get('/peak-delays')
    assert.ok(Array.isArray(rows) && rows.length > 0 && rows.length <= 24)
    assert.ok(rows.every((row) => Number(row.arrival_hour) >= 0 && Number(row.arrival_hour) <= 23))
    assert.ok(rows.every((row) => Number(row.observed_arrivals) > 0))
  })

  await test(`Q0 overview KPIs repeat ${repetition}`, async () => {
    const report = await get('/overview-kpis')
    assert.ok(report && Object.hasOwn(report, 'current') && Object.hasOwn(report, 'previous'))
  })
}

for (const year of ['2025', '2024']) {
  await test(`Q3 yearly slice: ${year}`, async () => {
    const rows = await get(`/olap-slice?year=${year}`)
    assert.ok(Array.isArray(rows), 'expected a row array')
    if (year === '2025') assert.ok(rows.length > 0, 'expected data for 2025')
  })
}

await test('Q3 rejects an invalid year', async () => {
  const result = await get('/olap-slice?year=20xx', 400)
  assert.ok(result.error)
})

const diceCases = [
  ['unfiltered slice over a short range', { ...dateRange }],
  ['operator filter', { operators: 'NS', ...dateRange }],
  ['service-type filter', { service_types: 'Intercity', ...dateRange }],
  ['station and date filter', { station_ids: '1', start_date: '2025-01-01', end_date: '2025-01-01' }],
  ['combined filters', { operators: 'NS', service_types: 'Intercity', ...dateRange }]
]

for (const [name, params] of diceCases) {
  await test(`Q4 dice: ${name}`, async () => {
    const rows = await get(`/olap-dice?${q(params)}`)
    assert.ok(Array.isArray(rows) && rows.length > 0, 'expected grouped rows and grand total')
    assert.ok(rows.some((row) => row.grouping_level === 'Grand Total'))
    assert.ok(rows.every((row) => Number(row.total_stops) >= 0))
  })
}

await test('Q4 rejects an invalid station key', async () => {
  const result = await get('/olap-dice?station_ids=0', 400)
  assert.ok(result.error)
})

console.table(results)
const failures = results.filter((result) => result.status === 'FAIL')
if (failures.length) {
  console.error(`\n${failures.length} functional test(s) failed.`)
  process.exitCode = 1
} else {
  console.log(`\nAll ${results.length} functional checks passed.`)
}
