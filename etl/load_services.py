import csv
import os
from pathlib import Path
from time import monotonic

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "services-2025.csv"

EXPECTED_HEADERS = (
    "Service:RDT-ID,Service:Date,Service:Type,Service:Company,"
    "Service:Train number,Service:Completely cancelled,"
    "Service:Partly cancelled,Service:Maximum delay,"
    "Stop:RDT-ID,Stop:Station code,Stop:Station name,"
    "Stop:Arrival time,Stop:Arrival delay,Stop:Arrival cancelled,"
    "Stop:Departure time,Stop:Departure delay,"
    "Stop:Departure cancelled,Stop:Platform change,"
    "Stop:Planned platform,Stop:Actual platform"
).split(",")

def report(message, started):
    print(f"[{monotonic() - started:,.1f}s] {message}", flush=True)


def copy_csv(cur, path):
    with path.open("rb") as source:
        header = source.readline().decode("utf-8-sig")
        if next(csv.reader([header]), None) != EXPECTED_HEADERS:
            raise ValueError("CSV headers do not match the expected format.")
        total = os.fstat(source.fileno()).st_size - source.tell()
        transferred = 0
        started = last_update = monotonic()
        with cur.copy("""
            COPY stage_services FROM STDIN
            WITH (FORMAT CSV, ENCODING 'UTF8')
        """) as copy:
            while block := source.read(1024 * 1024):
                copy.write(block)
                transferred += len(block)
                now = monotonic()
                if now - last_update >= 5:
                    print(
                        f"CSV transfer: {transferred / total:.1%} "
                        f"({transferred / 1024**2:,.1f}/{total / 1024**2:,.1f} MiB), "
                        f"{transferred / 1024**2 / (now - started):.1f} MiB/s",
                        flush=True,
                    )
                    last_update = now
        report(f"CSV COPY complete: {transferred / 1024**2:,.1f} MiB", started)


def main():
    import psycopg
    from dotenv import load_dotenv

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

    
    started = monotonic()
    report("Connecting to PostgreSQL...", started)
    with psycopg.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('dutch_railway_dw.dim_date')")
            if cur.fetchone()[0] is None:
                cur.execute(
                    (ROOT / "sql" / "dutch_railway_dw.sql")
                    .read_text(encoding="utf-8-sig")
                )
            cur.execute("SET LOCAL search_path TO dutch_railway_dw, public")
            report("Waiting for warehouse write lock...", started)
            cur.execute("""
                LOCK TABLE dim_date, dim_station, dim_service,
                           fact_station_stop
                IN SHARE ROW EXCLUSIVE MODE
            """)
            cur.execute("""
                SELECT EXISTS (SELECT 1 FROM dim_date)
                    OR EXISTS (SELECT 1 FROM dim_station)
                    OR EXISTS (SELECT 1 FROM dim_service)
                    OR EXISTS (SELECT 1 FROM fact_station_stop)
            """)
            if cur.fetchone()[0]:
                raise ValueError(
                    "Warehouse is not empty. This loader is for the first load."
                )
                
            cur.execute("""
                CREATE TEMP TABLE stage_services (
                    service_id BIGINT NOT NULL,
                    service_date DATE NOT NULL,
                    service_type TEXT,
                    company TEXT,
                    train_number BIGINT,
                    completely_cancelled TEXT,
                    partly_cancelled TEXT,
                    maximum_delay TEXT,
                    stop_id BIGINT NOT NULL,
                    station_code TEXT NOT NULL CHECK (station_code <> ''),
                    station_name TEXT,
                    arrival_time TIMESTAMPTZ,
                    arrival_delay BIGINT,
                    arrival_cancelled BOOLEAN,
                    departure_time TIMESTAMPTZ,
                    departure_delay BIGINT,
                    departure_cancelled BOOLEAN,
                    platform_change TEXT,
                    planned_platform TEXT,
                    actual_platform TEXT
                ) ON COMMIT DROP
            """)
            report("Streaming CSV into staging...", started)
            copy_csv(cur, CSV_PATH)
            report("Counting staged stops...", started)
            cur.execute("SELECT COUNT(*) FROM stage_services")
            expected = cur.fetchone()[0]
            if expected == 0:
                raise ValueError("CSV contains no station stops.")

            
            report(f"Validating {expected:,} staged stops...", started)
            cur.execute("CREATE UNIQUE INDEX ON stage_services (stop_id)")
            cur.execute("ANALYZE stage_services")
            cur.execute("""
                SELECT station_code
                FROM stage_services
                GROUP BY station_code
                HAVING COUNT(DISTINCT station_name) > 1
                LIMIT 1
            """)
            conflict = cur.fetchone()
            if conflict:
                raise ValueError(
                    f"Conflicting station names for code {conflict[0]}"
                )

            report("Loading date dimension...", started)
            cur.execute("""
                INSERT INTO dim_date
                    (date_key, full_date, day_number, month_number,
                     month_name, quarter_number, year_number)
                SELECT
                    TO_CHAR(d, 'YYYYMMDD')::INTEGER,
                    d,
                    EXTRACT(DAY FROM d)::SMALLINT,
                    EXTRACT(MONTH FROM d)::SMALLINT,
                    TO_CHAR(d, 'FMMonth'),
                    EXTRACT(QUARTER FROM d)::SMALLINT,
                    EXTRACT(YEAR FROM d)::SMALLINT
                FROM (
                    SELECT DISTINCT service_date AS d FROM stage_services
                ) dates
            """)
            report(f"Inserted {cur.rowcount:,} dates; loading stations...", started)
            cur.execute("""
                INSERT INTO dim_station (station_code, station_name)
                SELECT station_code, MAX(station_name)
                FROM stage_services
                GROUP BY station_code
            """)
            report(f"Inserted {cur.rowcount:,} stations; loading services...", started)
            cur.execute("""
                INSERT INTO dim_service
                    (source_service_id, service_type, company, train_number)
                SELECT DISTINCT
                    service_id, service_type, company, train_number
                FROM stage_services
            """)
            report(f"Inserted {cur.rowcount:,} services; analyzing dimensions...", started)
            cur.execute("ANALYZE dim_station")
            cur.execute("ANALYZE dim_service")

            report(f"Loading {expected:,} station-stop facts...", started)
            cur.execute("""
                INSERT INTO fact_station_stop (
                    source_stop_id, date_key, station_key, service_key,
                    arrival_time, arrival_delay, arrival_cancelled,
                    departure_time, departure_delay, departure_cancelled
                )
                SELECT
                    s.stop_id,
                    TO_CHAR(s.service_date, 'YYYYMMDD')::INTEGER,
                    station.station_key,
                    service.service_key,
                    s.arrival_time,
                    s.arrival_delay,
                    s.arrival_cancelled,
                    s.departure_time,
                    s.departure_delay,
                    s.departure_cancelled
                FROM stage_services s
                JOIN dim_station station
                  ON station.station_code = s.station_code
                JOIN dim_service service
                  ON service.source_service_id = s.service_id
            """)
            inserted = cur.rowcount
            if inserted != expected:
                raise ValueError(
                    f"Row mismatch: staged {expected}, inserted {inserted}"
                )
            report(f"Inserted {inserted:,} facts; analyzing fact table...", started)
            cur.execute("ANALYZE fact_station_stop")
            report("Committing warehouse load...", started)
    report(f"Committed {inserted:,} station-stop facts.", started)


if __name__ == "__main__":
    main()
