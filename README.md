# dutch-railway-olap

## Run the backend

Install Node.js 24 or newer (with npm), then run:

```sh
cd backend
npm install
npm run dev
```

The TypeScript Fastify server starts at `http://127.0.0.1:3000` and reloads when source files change. No endpoints are registered yet, so requests return `404 Not Found`. Press Ctrl+C to stop it.

`npm run dev` uses readable logs with local timestamps and colored levels in the terminal. `npm start` keeps structured JSON logs.

Optionally create `backend/.env` by copying `backend/.env.example` to customize these settings:

```dotenv
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
```

Run backend commands from `backend/`. Existing environment variables take precedence over `.env`; the root database `.env` is separate. Restart the server after changing environment settings.

To compile and run the backend:

```sh
npm run build
npm start
```

Check code quality with `npm run lint` and `npm run typecheck`. This scaffold runs locally without a database connection.

## Run the database

The database runs in Docker as PostgreSQL 17. Start Docker Desktop before running the commands below.

### First-time setup

Run commands from the repository root (the folder containing `docker-compose.yml`). If your terminal is currently in `backend/`, run `cd ..` first.

Create a `.env` file in the repository root if you do not already have one:

```dotenv
POSTGRES_USER=stadvdb_mco1
POSTGRES_PASSWORD=local_dev_password
POSTGRES_DB=dutch-railway
```

Use a non-empty password for a new database and keep `.env` out of version control. If your database is already initialized, keep its existing credentials.

### Start and check the database

```powershell
docker compose up -d --wait postgres
docker compose ps
```

`up` creates the container if needed, starts it in the background, and waits for the health check. A successful status looks like:

```text
NAME          SERVICE    STATUS                   PORTS
postgres_db   postgres   Up ... (healthy)          127.0.0.1:5432->5432/tcp
```

An empty `docker compose ps` table means no containers are running for this project. Use `docker compose ps -a` to also see stopped containers.

### Connect to PostgreSQL

Connect using a PostgreSQL client with these settings:

| Setting | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| User | The `POSTGRES_USER` value in `.env` |
| Password | The `POSTGRES_PASSWORD` value in `.env` |
| Database | The `POSTGRES_DB` value in `.env` |

With the example settings above, open an interactive SQL session inside the container:

```powershell
docker compose exec postgres psql -U stadvdb_mco1 -d dutch-railway
```

If your `.env` values differ, replace the names after `-U` and `-d`. Try `SELECT 1;` to check the connection, and type `\q` to exit the SQL session. Exiting `psql` does not stop the database.

### Stop and restart

Stop just PostgreSQL while keeping its container and saved data:

```powershell
docker compose stop postgres
```

Start the stopped container again:

```powershell
docker compose start postgres
docker compose ps
```

You can also use `docker compose up -d --wait postgres` again to start it and wait until healthy.

To remove the project's containers and network while keeping database data, use `docker compose down`.

Data is stored in the `postgres_data` Docker volume and survives container and computer restarts. **`docker compose down -v` deletes the database volume and its saved data.** Changing the user, password, or database name in `.env` does not update an already initialized database.

### Troubleshooting

View database logs if startup fails:

```powershell
docker compose logs --tail 100 postgres
```

If Docker reports that port `5432` is unavailable or access is forbidden, check for another local PostgreSQL instance in PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Stop the conflicting PostgreSQL instance if you do not need it, then retry startup. Alternatively, change the port mapping in `docker-compose.yml` to `"127.0.0.1:5433:5432"` and run `docker compose up -d --wait postgres` again. Connect from your computer using port `5433` afterward; PostgreSQL inside the container still uses `5432`. Setting `POSTGRES_PORT` in `.env` alone does not change the current Compose port mapping.
