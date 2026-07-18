# chatui

A ChatGPT-like web UI on top of [`vllm-router`](../vllm-router). v1 scope:
login, conversation history, streaming responses, model picker. Agents and
tools (including phone-call-specific ones drawing on `fw`/`ochat`/`reporter`)
are a deliberate later addition, not part of this pass.

Accounts are admin-provisioned only - no public signup. Every chatui user
gets their own `vllm-router` user, provisioned automatically at creation
time via `vllm-router`'s `POST /admin/users`, so `vllm-router`'s `/usage`
tracking works per real person for free.

## Backend (`backend/`)

```bash
cd backend
uv venv --python 3.13 --seed
. activate_env.inc
uv sync
cp .env.example .env
```

Fill in `.env`:
- `VLLM_ROUTER_URL` - where `vllm-router` is running (default `http://localhost:8001`).
- `VLLM_ROUTER_ADMIN_KEY` - a `vllm-router` admin API key (see `vllm-router/add_user.py`).
- `CHATUI_JWT_SECRET` - random secret for signing session cookies, e.g.
  `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`.

Bootstrap the first admin:

```bash
python3 add_user.py alice --role admin
```

Prints a generated login password - save it, it's shown only once. Admins
can add more users afterward via `POST /admin/users` (same shape as
`vllm-router`'s).

Run: `bash serve.sh fg` (foreground) or `bash serve.sh` (background, port 8002).

## Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev
```

Serves on port 3000, proxying `/api/*` to the backend (port 8002) via
Next.js rewrites - no CORS setup needed.

## Architecture

- `backend/db.py` - SQLite (`chatui.db`, gitignored): `users`,
  `conversations`, `messages`.
- `backend/vllm_client.py` - talks to `vllm-router`: list models, stream
  chat completions, provision new `vllm-router` users.
- `backend/auth.py` - chatui's own browser session auth (JWT in an httpOnly
  cookie) - a separate concern from `vllm-router`'s Bearer-token API auth.
- `backend/app.py` - FastAPI routes: auth, conversations/messages
  (streaming), `/api/models`, `/admin/users`.
- `frontend/app/` - Next.js App Router: `/login`, `/` (chat, sidebar +
  streaming message view + model picker).
