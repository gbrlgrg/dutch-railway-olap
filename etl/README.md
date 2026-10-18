# Load services CSV

Run from the repository root with Python 3.10 or newer. Start Docker Desktop,
configure the root `.env` as described in the root README, and run:

```powershell
docker compose up -d --wait postgres
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r etl/requirements.txt

.\.venv\Scripts\python.exe etl/load_services.py
```

After the loader finishes successfully, run the functional tests:

```powershell
.\.venv\Scripts\python.exe etl/test_etl.py
```

The tests use the same root `.env` and `PG*` connection overrides as the loader.
They query the committed warehouse in a read-only transaction and check populated
tables, unique stop IDs, dimension references, date attributes, station codes,
and the fact count against all CSV records. They also compare the first ten stops,
every 100,000th stop, and the final stop against the CSV, including timestamps,
delays, cancellation flags, and dimension mappings. Field values are sampled;
station-name and service-attribute selection are not reconciled.

The CSV count reads the entire source file, so this check can take several minutes
on the full dataset. Keep `data/services-2025.csv` unchanged after loading.
Failures or connection errors produce a nonzero exit code. These tests do not
run the loader or modify warehouse data.
