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

Install Docker with Docker Compose (Docker Desktop includes both), and make sure Docker is running. Run the commands below from the repository root.

1. Create a `.env` file in the repository root, or update your existing one:

   ```dotenv
   POSTGRES_USER="stadvdb_mco1"
   POSTGRES_PASSWORD=""
   POSTGRES_DB="dutch-railway"
   POSTGRES_PORT=5432

   ```

   These are example credentials for local development. Keep `.env` out of version control.

2. Start PostgreSQL 17 and wait for it to become healthy:

   ```sh
   docker compose up -d --wait postgres
   ```

3. Check the database status:

   ```sh
   docker compose ps
   ```

   To troubleshoot startup, view the logs:

   ```sh
   docker compose logs postgres
   ```

Connect using a PostgreSQL client with these settings:

| Setting | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| User | The `POSTGRES_USER` value in `.env` |
| Password | The `POSTGRES_PASSWORD` value in `.env` |
| Database | The `POSTGRES_DB` value in `.env` |

With the example settings above, open an interactive SQL session inside the container:

```sh
docker compose exec postgres psql -U railway -d railway
```

If you use different `.env` values, replace `railway` after `-U` and `-d` with your user and database names. Type `\q` to exit the SQL session.

Stop the database:

```sh
docker compose down
```

Database data persists in the `postgres_data` Docker volume across restarts and shutdowns. The `.env` settings initialize the database only when that volume is empty; changing them later does not update an existing database's user, password, or name. Port `5432` must be available on your machine.
