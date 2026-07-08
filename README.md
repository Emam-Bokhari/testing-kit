# Performance Tester

A minimal, standalone Node.js + TypeScript microservice for load-testing any Express + TypeScript backend.

It lets you:
1. Register a project
2. Discover its Express routes automatically
3. Run k6 load tests against it
4. Generate HTML/JSON performance reports

> **Status:** All modules complete — **Project Registration**, **Route Discovery**, **Request Generator & Load Test Execution**, and **Report Generation**.

---

## Requirements

- **Node.js** v18 or higher
- **npm** v9 or higher
- **k6** (required starting now — see below)

Check your versions:
```bash
node -v
npm -v
k6 version
```

### Installing k6

- **Windows (choco):** `choco install k6`
- **macOS (brew):** `brew install k6`
- **Linux (apt):**
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  ```
- Verify: `k6 version`

---

## Installation

```bash
# 1. Unzip / clone the project, then move into it
cd performance-tester

# 2. Install dependencies
npm install

# 3. Start the service in dev mode (auto-restarts on file changes)
npm run dev
```

The service starts at:
```
http://localhost:4000
```

You should see:
```
Performance Tester service running on http://localhost:4000
```

### Project Structure
```
performance-tester/
├── src/
│   ├── app.ts              # Express app + route wiring
│   ├── server.ts            # Server bootstrap (listens on PORT)
│   ├── routes/               # Express route definitions
│   ├── controllers/          # Request/response handling
│   ├── services/             # Business logic (storage, discovery, etc.)
│   └── utils/                 # Shared types & error handling
├── generated/                 # Auto-generated k6 scripts (future module)
├── reports/                    # Generated summary.html / summary.json (future module)
├── storage/
│   └── projects.json          # Registered projects (flat-file storage, no DB)
├── package.json
├── tsconfig.json
└── README.md
```

### Configuration

No `.env` file is required for Module 1. The server port defaults to `4000` and can be overridden:
```bash
PORT=5000 npm run dev
```

---

## Usage

### 1. Register a Project

`POST /projects`

Registers a target Express + TypeScript project so it can later be discovered and load-tested. The `entryFile` must exist on disk at `projectPath/entryFile`, or registration will fail.

**Request body:**
```json
{
  "name": "Photolagbe",
  "baseUrl": "http://localhost:5000",
  "projectPath": "C:/Projects/photolagbe",
  "entryFile": "src/app.ts",
  "jwtToken": "YOUR_JWT"
}
```

| Field         | Required | Description                                              |
|---------------|----------|------------------------------------------------------------|
| `name`        | Yes      | A friendly name for the project                          |
| `baseUrl`     | Yes      | Base URL where the target backend is running              |
| `projectPath` | Yes      | Absolute path to the target project's root folder         |
| `entryFile`   | Yes      | Path (relative to `projectPath`) to the Express entry file |
| `jwtToken`    | No       | JWT attached as `Authorization: Bearer <token>` on test requests (used starting from the Load Test module) |

**Example (curl):**
```bash
curl -X POST http://localhost:4000/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Photolagbe",
    "baseUrl": "http://localhost:5000",
    "projectPath": "C:/Projects/photolagbe",
    "entryFile": "src/app.ts",
    "jwtToken": "YOUR_JWT"
  }'
```

**Success response (201):**
```json
{
  "id": "9fbba20f-df3b-4109-a283-1ba534d1eb01",
  "name": "Photolagbe",
  "baseUrl": "http://localhost:5000",
  "projectPath": "C:/Projects/photolagbe",
  "entryFile": "src/app.ts",
  "jwtToken": "YOUR_JWT"
}
```

**Error responses:**
```json
// Missing required field
{ "error": "Invalid configuration: name, baseUrl, projectPath and entryFile are required" }

// Entry file doesn't exist on disk
{ "error": "Entry file not found: C:/Projects/photolagbe/src/app.ts" }
```

Registered projects are persisted to `storage/projects.json`.

### 2. List Registered Projects

`GET /projects`

```bash
curl http://localhost:4000/projects
```

**Response (200):**
```json
[
  {
    "id": "9fbba20f-df3b-4109-a283-1ba534d1eb01",
    "name": "Photolagbe",
    "baseUrl": "http://localhost:5000",
    "projectPath": "C:/Projects/photolagbe",
    "entryFile": "src/app.ts",
    "jwtToken": "YOUR_JWT"
  }
]
```

### 3. Discover Routes

`POST /projects/:id/discover`

Statically analyzes the registered project's `entryFile` (and everything it imports, recursively) to find Express route registrations. **It does not run or execute the target project** — it only reads and parses the TypeScript source — so there's no need for the target's database, environment variables, or other dependencies to be available.

Supported patterns:
- Direct `app.get/post/put/patch/delete(path, handler)` calls
- `app.use(path, router)` / `router.use(path, router)` mounts, following the import to the sub-router file
- `router.use(subRouter)` (no path) mounts
- The common `[{ path, route }].forEach(r => router.use(r.path, r.route))` pattern used by many Express boilerplates (including nested `Routes.v1Routes`-style namespace exports)

```bash
curl -X POST http://localhost:4000/projects/<PROJECT_ID>/discover
```

**Response (200):**
```json
{
  "projectId": "<PROJECT_ID>",
  "count": 8,
  "routes": [
    { "method": "GET", "path": "/api/v1/user" },
    { "method": "GET", "path": "/api/v1/user/:id" },
    { "method": "POST", "path": "/api/v1/user" },
    { "method": "PATCH", "path": "/api/v1/user/:id" },
    { "method": "DELETE", "path": "/api/v1/user/:id" },
    { "method": "POST", "path": "/api/v1/auth/login" },
    { "method": "POST", "path": "/api/v1/auth/register" },
    { "method": "GET", "path": "/" }
  ]
}
```

Discovered routes are persisted to `storage/routes.json`, keyed by project ID.

**Error responses:**
```json
// Unknown project id
{ "error": "Project not found: <id>" }

// Entry file missing (e.g. project was moved since registration)
{ "error": "Entry file not found: <path>" }
```

### 4. Run Load Test

`POST /projects/:id/run`

Generates a k6 load-test script from the project's discovered routes and runs it with `k6 run`. You must run **Discover Routes** for this project at least once before running a test.

For every discovered route:
- Path params (e.g. `:userId`) are filled with a dummy value (`1`)
- `POST`/`PUT`/`PATCH` requests get a small generic JSON body (`{ "name": "test", "value": 1, "active": true }`) — not business-specific, just enough to exercise the endpoint
- Every request gets `Authorization: Bearer <jwtToken>` attached (if a token was provided at registration)
- `GET`/`DELETE` requests have no body

**Request body (optional):**
```json
{
  "vus": 5,
  "duration": "10s"
}
```

| Field      | Required | Default | Description                                  |
|------------|----------|---------|------------------------------------------------|
| `vus`      | No       | `5`     | Number of virtual users (concurrent load)      |
| `duration` | No       | `"10s"` | How long the test runs, e.g. `"30s"`, `"1m"`   |

```bash
curl -X POST http://localhost:4000/projects/<PROJECT_ID>/run \
  -H "Content-Type: application/json" \
  -d '{ "vus": 10, "duration": "30s" }'
```

**Response (200):**
```json
{
  "projectId": "<PROJECT_ID>",
  "message": "Load test completed",
  "requestCount": 72,
  "vus": 10,
  "duration": "30s",
  "scriptPath": ".../generated/<PROJECT_ID>.js",
  "rawSummaryPath": ".../reports/<PROJECT_ID>-raw-summary.json"
}
```

The generated k6 script is saved to `generated/<PROJECT_ID>.js` (useful if you want to inspect or re-run it manually with `k6 run`). The raw k6 metrics are saved to `reports/<PROJECT_ID>-raw-summary.json` — the next module will turn this into the friendly `summary.html` / `summary.json` report.

**Error responses:**
```json
// Routes not discovered yet
{ "error": "No discovered routes found for this project. Run POST /projects/:id/discover first." }

// Invalid vus/duration
{ "error": "Invalid configuration: vus must be a positive number" }
{ "error": "Invalid configuration: duration must be a non-empty string (e.g. '10s')" }

// k6 not installed
{ "error": "k6 not installed: could not find the 'k6' command in PATH." }
```

---

### 5. View Report

`GET /reports/:id`

Returns the HTML performance report (`Content-Type: text/html`) for a project's most recent load test. Open this URL directly in your browser:

```
http://localhost:4000/reports/<PROJECT_ID>
```

The report includes:
- Total Requests
- Requests / sec (RPS)
- Average Response Time
- P95 and P99 Response Time
- Success Rate / Failure Rate
- Slowest Endpoints (top 5, by average response time)
- Fastest Endpoints (top 5, by average response time)
- All Endpoints (every discovered route, with its own average response time)

The underlying files are also saved on disk if you want to consume them programmatically:
- `reports/<PROJECT_ID>-summary.json` — the same data as structured JSON
- `reports/<PROJECT_ID>-summary.html` — the HTML page served by this endpoint
- `reports/<PROJECT_ID>-raw-summary.json` — the raw k6 metrics export (advanced/debugging use)

A report is generated automatically at the end of every `POST /projects/:id/run` call, so you don't need to call anything extra — just run a load test, then open this URL.

**Error response:**
```json
// No test has been run yet for this project
{ "error": "No report found for project <id>. Run POST /projects/:id/run first." }
```

---

## Full Workflow (end to end)

```bash
# 1. Register your project
curl -X POST http://localhost:4000/projects -H "Content-Type: application/json" -d '{ ... }'

# 2. Discover its routes
curl -X POST http://localhost:4000/projects/<id>/discover

# 3. Run a load test
curl -X POST http://localhost:4000/projects/<id>/run -H "Content-Type: application/json" -d '{ "vus": 10, "duration": "30s" }'

# 4. Open the report in your browser
http://localhost:4000/reports/<id>
```
