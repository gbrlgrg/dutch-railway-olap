"""Read-only functional checks to run after load_services.py commits."""

import csv
import os
import unittest
from datetime import date, datetime

import psycopg
from dotenv import load_dotenv

try:
    from .load_services import CSV_PATH, EXPECTED_HEADERS, ROOT
except ImportError:
    from load_services import CSV_PATH, EXPECTED_HEADERS, ROOT


class LoadedServicesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        load_dotenv(ROOT / ".env", encoding="utf-8-sig")
        for pg_name, compose_name in (
            ("PGDATABASE", "POSTGRES_DB"),
            ("PGUSER", "POSTGRES_USER"),
            ("PGPASSWORD", "POSTGRES_PASSWORD"),
        ):
            if compose_name in os.environ:
                os.environ.setdefault(pg_name, os.environ[compose_name])
        os.environ.setdefault("PGHOST", "localhost")
        os.environ.setdefault("PGPORT", "5432")

        cls.conn = psycopg.connect(connect_timeout=10)
        cls.addClassCleanup(cls.conn.close)
        cls.conn.execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
        cls.conn.execute("SET LOCAL search_path TO dutch_railway_dw, public")

    def test_tables_are_populated(self):
        """All warehouse tables contain loaded data"""
        for table in ("dim_date", "dim_station", "dim_service", "fact_station_stop"):
            with self.subTest(table=table):
                populated = self.conn.execute(
                    psycopg.sql.SQL("SELECT EXISTS (SELECT 1 FROM {})").format(
                        psycopg.sql.Identifier(table)
                    )
                ).fetchone()[0]
                self.assertTrue(populated, f"{table} is empty; run load_services.py first")

    def test_fact_grain_and_stop_count(self):
        """Each source stop appears once and represents exactly one stop"""
        total, unique_stops, invalid_counts = self.conn.execute("""
            SELECT COUNT(*), COUNT(DISTINCT source_stop_id),
                   COUNT(*) FILTER (WHERE stop_count IS DISTINCT FROM 1)
            FROM fact_station_stop
        """).fetchone()
        self.assertGreater(total, 0, "No facts loaded")
        self.assertEqual(total, unique_stops, "Duplicate or NULL source stop IDs")
        self.assertEqual(invalid_counts, 0, "Each fact must represent exactly one stop")

    def test_facts_have_matching_dimensions(self):
        """Every stop links to an existing date, station, and service"""
        invalid = self.conn.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM fact_station_stop f
                LEFT JOIN dim_date d USING (date_key)
                LEFT JOIN dim_station s USING (station_key)
                LEFT JOIN dim_service v USING (service_key)
                WHERE d.date_key IS NULL OR s.station_key IS NULL
                   OR v.service_key IS NULL
            )
        """).fetchone()[0]
        self.assertFalse(invalid, "Facts contain missing dimension references")

    def test_dimension_values(self):
        """Date attributes are correct and station codes are present and unique"""
        invalid_dates = self.conn.execute("""
            SELECT COUNT(*) FROM dim_date
            WHERE date_key <> TO_CHAR(full_date, 'YYYYMMDD')::INTEGER
               OR day_number <> EXTRACT(DAY FROM full_date)
               OR month_number <> EXTRACT(MONTH FROM full_date)
               OR month_name <> TO_CHAR(full_date, 'FMMonth')
               OR quarter_number <> EXTRACT(QUARTER FROM full_date)
               OR year_number <> EXTRACT(YEAR FROM full_date)
        """).fetchone()[0]
        self.assertEqual(invalid_dates, 0, "Date attributes do not match full_date")
        invalid_stations = self.conn.execute("""
            SELECT COUNT(*) FROM (
                SELECT station_code FROM dim_station
                GROUP BY station_code
                HAVING station_code IS NULL OR station_code = '' OR COUNT(*) > 1
            ) invalid
        """).fetchone()[0]
        self.assertEqual(invalid_stations, 0, "Station codes must be present and unique")

    def test_csv_row_count_and_sampled_stop_values(self):
        """Loaded row count and sampled stop values match the source CSV"""
        total = self.conn.execute("SELECT COUNT(*) FROM fact_station_stop").fetchone()[0]
        self.assertGreater(total, 0, "No facts loaded; run load_services.py first")
        samples = []
        expected_count = 0
        with CSV_PATH.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            self.assertEqual(reader.fieldnames, EXPECTED_HEADERS)
            for expected_count, row in enumerate(reader, start=1):
                if expected_count <= 10 or expected_count % 100_000 == 0:
                    samples.append(row)
            if expected_count:
                samples.append(row)  # Include the end of the source as well.
        self.assertEqual(total, expected_count, "Loaded fact count differs from CSV rows")

        # shortcut: sample values across the CSV; use full reconciliation if every field must be audited.
        rows = self.conn.execute("""
            SELECT f.source_stop_id, d.full_date, s.station_code, v.source_service_id,
                   f.arrival_time, f.arrival_delay, f.arrival_cancelled,
                   f.departure_time, f.departure_delay, f.departure_cancelled
            FROM fact_station_stop f
            JOIN dim_date d USING (date_key)
            JOIN dim_station s USING (station_key)
            JOIN dim_service v USING (service_key)
            WHERE f.source_stop_id = ANY(%s)
        """, ([int(row["Stop:RDT-ID"]) for row in samples],)).fetchall()
        actual = {row[0]: row[1:] for row in rows}
        for row in samples:
            stop_id = int(row["Stop:RDT-ID"])
            expected = [
                date.fromisoformat(row["Service:Date"]),
                row["Stop:Station code"],
                int(row["Service:RDT-ID"]),
            ]
            for event in ("Arrival", "Departure"):
                timestamp = row[f"Stop:{event} time"]
                delay = row[f"Stop:{event} delay"]
                cancelled = row[f"Stop:{event} cancelled"]
                expected.extend((
                    datetime.fromisoformat(timestamp) if timestamp else None,
                    int(delay) if delay else None,
                    cancelled.lower() == "true" if cancelled else None,
                ))
            with self.subTest(source_stop_id=stop_id):
                self.assertIn(stop_id, actual, "CSV stop missing from warehouse")
                self.assertEqual(actual[stop_id], tuple(expected))


class FunctionalTestResult(unittest.TextTestResult):
    def getDescription(self, test):
        description = test.shortDescription() or str(test)
        params = getattr(test, "params", None)
        if params:
            details = ", ".join(f"{key}={value!r}" for key, value in params.items())
            return f"{description} ({details})"
        return description

    def startTest(self, test):
        unittest.TestResult.startTest(self, test)
        self.stream.writeln(f"[RUN ] {self.getDescription(test)}")
        self.stream.flush()
        self._failures_before = len(self.failures)
        self._errors_before = len(self.errors)

    def stopTest(self, test):
        if len(self.errors) > self._errors_before:
            status = "ERROR"
        elif len(self.failures) > self._failures_before:
            status = "FAIL"
        else:
            status = "PASS"
        self.stream.writeln(f"[{status}] {self.getDescription(test)}")
        self.stream.flush()
        super().stopTest(test)


if __name__ == "__main__":
    unittest.main(
        testRunner=unittest.TextTestRunner(resultclass=FunctionalTestResult, verbosity=0)
    )
