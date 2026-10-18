-- ============================================================
-- DUTCH RAILWAY DATA WAREHOUSE
-- Database: dutch_railway_dw
-- Schema:   dutch_railway_dw
-- DBMS:     PostgreSQL 17
-- Model:    Star Schema
-- ============================================================


CREATE SCHEMA IF NOT EXISTS dutch_railway_dw;

-- ============================================================
-- 1. DIMENSION TABLE: DATE
-- Hierarchy: Day -> Month -> Quarter -> Year
-- ============================================================

CREATE TABLE dutch_railway_dw.dim_date (
    date_key       INTEGER PRIMARY KEY,
    full_date      DATE NOT NULL UNIQUE,
    day_number     SMALLINT NOT NULL,
    month_number   SMALLINT NOT NULL,
    month_name     VARCHAR(15) NOT NULL,
    quarter_number SMALLINT NOT NULL,
    year_number    SMALLINT NOT NULL,

    CONSTRAINT chk_date_key
        CHECK (date_key = TO_CHAR(full_date, 'YYYYMMDD')::INTEGER),

    CONSTRAINT chk_day_number
        CHECK (day_number BETWEEN 1 AND 31),

    CONSTRAINT chk_month_number
        CHECK (month_number BETWEEN 1 AND 12),

    CONSTRAINT chk_quarter_number
        CHECK (quarter_number BETWEEN 1 AND 4)
);

-- ============================================================
-- 2. DIMENSION TABLE: STATION
-- ============================================================

CREATE TABLE dutch_railway_dw.dim_station (
    station_key       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    station_code      VARCHAR(50),
    station_name      VARCHAR(255)
);

-- ============================================================
-- 3. DIMENSION TABLE: SERVICE
-- ============================================================

CREATE TABLE dutch_railway_dw.dim_service (
    service_key       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_service_id BIGINT NOT NULL UNIQUE,
    service_type      VARCHAR(100),
    company           VARCHAR(150),
    train_number      BIGINT
);

-- ============================================================
-- 4. FACT TABLE: STATION STOP
-- Grain: One row per station stop
-- ============================================================

CREATE TABLE dutch_railway_dw.fact_station_stop (
    fact_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_stop_id      BIGINT,

    date_key            INTEGER NOT NULL,
    station_key         BIGINT NOT NULL,
    service_key         BIGINT NOT NULL,

    arrival_time        TIMESTAMPTZ,
    arrival_delay       BIGINT,
    arrival_cancelled   BOOLEAN,

    departure_time      TIMESTAMPTZ,
    departure_delay     BIGINT,
    departure_cancelled BOOLEAN,

    stop_count          SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT fk_stop_date
        FOREIGN KEY (date_key)
        REFERENCES dutch_railway_dw.dim_date(date_key),

    CONSTRAINT fk_stop_station
        FOREIGN KEY (station_key)
        REFERENCES dutch_railway_dw.dim_station(station_key),

    CONSTRAINT fk_stop_service
        FOREIGN KEY (service_key)
        REFERENCES dutch_railway_dw.dim_service(service_key),

    CONSTRAINT chk_stop_count
        CHECK (stop_count = 1)
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX idx_fact_station_stop_date
ON dutch_railway_dw.fact_station_stop (date_key);

CREATE INDEX idx_fact_station_stop_date_station
ON dutch_railway_dw.fact_station_stop (date_key, station_key);

CREATE INDEX idx_fact_station_stop_date_service
ON dutch_railway_dw.fact_station_stop (date_key, service_key);

CREATE INDEX idx_dim_service_company
ON dutch_railway_dw.dim_service (company);

CREATE INDEX idx_dim_service_type
ON dutch_railway_dw.dim_service (service_type);

-- ============================================================
-- 6. VERIFY THE SCHEMA
-- ============================================================

SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'dutch_railway_dw'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;