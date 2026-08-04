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

In production the backend runs as a systemd service
(`backend/chatui-backend.service`, installed to `/etc/systemd/system/`), so it
survives reboots and crashes:

```bash
sudo cp backend/chatui-backend.service /etc/systemd/system/   # once
sudo systemctl daemon-reload
sudo systemctl enable --now chatui-backend

systemctl status chatui-backend
sudo systemctl restart chatui-backend
```

It still logs to `backend/logs/backend.log`, and is ordered after
`vllm-router.service` (which it calls) so a boot brings the two up in the
right order.

For local debugging without systemd: `bash serve.sh fg` (foreground) or
`bash serve.sh` (background, port 8002) - but not while the service is
running, since port 8002 is already bound.

## Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev     # dev server with hot reload
```

Serves on port 3000, proxying `/api/*` to the backend (port 8002) via
Next.js rewrites - no CORS setup needed. Both `dev` and `start` bind the
Tailscale IP (`100.97.153.111`), since this is the one service in the tree a
remote browser has to reach.

In production it runs the `next build` output under systemd
(`frontend/chatui-frontend.service`):

```bash
sudo cp frontend/chatui-frontend.service /etc/systemd/system/   # once
sudo systemctl daemon-reload
sudo systemctl enable --now chatui-frontend
```

After changing frontend code, rebuild and restart - `next start` serves
whatever is in `.next/`, it does not pick up source changes:

```bash
cd frontend && npm run build && sudo systemctl restart chatui-frontend
```

Logs go to `frontend/logs/frontend.log`. The unit hardcodes the nvm node path
(`~/.nvm/versions/node/v24.18.0/bin/node`), so a node upgrade means editing
`ExecStart`/`PATH` in the unit - otherwise it fails with `status=203/EXEC`.

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
