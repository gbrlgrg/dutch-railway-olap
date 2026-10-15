# Load services CSV

Run from the repository root with Python 3.10 or newer. Start Docker Desktop,
configure the root `.env` as described in the root README, and run:

```powershell
docker compose up -d --wait postgres
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r etl/requirements.txt

.\.venv\Scripts\python.exe etl/load_services.py
```