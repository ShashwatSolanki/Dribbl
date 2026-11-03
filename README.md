# Dribbl

A real-time chat prototype built with **React, Vite, Express, PostgreSQL, and WebSockets**.

Dribbl demonstrates a simple registration/login flow and a browser-based chat interface with live message events. It is an early-stage prototype rather than a production-ready messaging service.

## What is implemented

- React 19 single-page application with login and registration views
- Express API endpoints for signup, login, and logout
- Password hashing with bcrypt
- PostgreSQL storage for user accounts
- WebSocket server using `ws` to relay live message events
- Configurable API and WebSocket endpoints for local or hosted development
- Optional HTTPS when certificate/key paths are supplied through environment variables

## Architecture

```text
React + Vite
  ├── REST requests ───────► Express API
  │                            └── PostgreSQL (users)
  └── WebSocket client ────► ws server
                               └── broadcasts message events
```

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 6, React Router |
| Backend | Node.js, Express 5 |
| Realtime | WebSocket (`ws`) |
| Database | PostgreSQL (`pg`) |
| Authentication | bcrypt password hashing |

## Run locally

### Requirements

- Node.js 20.6 or later
- PostgreSQL
- npm

### 1. Create the database and user table

Create a PostgreSQL database named `dribble_db`, then apply the included schema:

```bash
createdb dribble_db
psql -U postgres -d dribble_db -f schema.sql
```

If the database already exists, skip `createdb`.

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `PGPASSWORD` and any database settings in `.env`. The actual `.env` file is ignored by Git.

### 3. Install dependencies

```bash
npm install
```

### 4. Start the backend

In the first terminal:

```bash
npm run server
```

By default, the API and WebSocket server use `http://localhost:3001` and `ws://localhost:3001`.

### 5. Start the frontend

In a second terminal:

```bash
npm run dev
```

Open the local Vite URL printed in the terminal (normally `http://localhost:5173`).

## Configuration

The frontend reads:

- `VITE_API_BASE_URL` — base URL for the Express API
- `VITE_WS_URL` — WebSocket endpoint

The backend reads:

- `HOST`, `PORT`, and `CLIENT_ORIGIN`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`
- `SSL_KEY_PATH` and `SSL_CERT_PATH` — optional; set both to enable HTTPS

For HTTPS, generate or provision your own certificate and private key and store them outside this repository. Do not commit private keys or credentials.

## Prototype limitations

- Chat messages are held in client-side state and are not persisted in PostgreSQL.
- The current WebSocket server broadcasts incoming events to connected clients; it does not yet enforce recipient-level delivery or private-channel authorization.
- Login currently verifies credentials but does not issue a session or JWT. Add server-side session/token validation before using this outside a trusted demo environment.
- Configure a restricted production CORS origin and deploy behind properly managed TLS before exposing the service publicly.

## Repository layout

```text
.
├── src/                 # React application
├── server.js            # Express API and WebSocket server
├── schema.sql           # PostgreSQL user-table schema
├── .env.example         # Environment variable template
└── vite.config.js
```
