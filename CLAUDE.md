# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A ChatGPT-like web UI (`backend/`: FastAPI; `frontend/`: Next.js App Router) on top of `../vllm-router`. v1 scope is strictly chat: login, conversation history, streaming responses, model picker — agents/tools (including phone-call-specific ones drawing on `../fw`/`../ochat`/`../reporter`) are a deliberate later addition, not part of this pass. See `../CLAUDE.md` for how this fits alongside the other projects in this directory, and `README.md` for the full setup/architecture rundown (kept in sync with this file — don't let them diverge).

Accounts are **admin-provisioned only**, no public signup. The key design decision: every chatui user gets their own real `vllm-router` user, provisioned automatically at chatui-user creation time (`vllm_client.provision_vllm_user`, via a `vllm-router` admin key), so `vllm-router`'s per-user usage tracking works for free — chatui itself does no separate token accounting.

## Commands

Backend (Python 3.13, `uv`-managed, FastAPI):

```bash
cd backend
uv venv --python 3.13 --seed && . activate_env.inc && uv sync
cp .env.example .env   # VLLM_ROUTER_URL, VLLM_ROUTER_ADMIN_KEY, CHATUI_JWT_SECRET
python3 add_user.py <username> [--role admin]   # bootstrap/add a login, prints the generated password once
sudo systemctl {status,restart,stop} chatui-backend   # how it actually runs (backend/chatui-backend.service)
bash serve.sh fg        # foreground, port 8002, binds 127.0.0.1 - debugging only
bash serve.sh           # background, nohup, logs/backend.log
```

**systemd owns the backend process; `serve.sh` is for debugging.**
`backend/chatui-backend.service` (the repo copy of what's installed in
`/etc/systemd/system/`) runs uvicorn as `ubuntu` with `Restart=always`,
`PYTHONUNBUFFERED=1`, ordered `After=vllm-router.service`, still appending to
`backend/logs/backend.log`. Starting `serve.sh` alongside it just fails to bind
port 8002; stop it with `systemctl stop chatui-backend`, not by killing the PID
(systemd restarts it within 5 s).

Frontend (Next.js 16 / React 19 / TypeScript / Tailwind v4):

```bash
cd frontend
npm install
npm run dev      # port 3000, binds the Tailscale IP (package.json's -H flag) - not localhost, so curl from this box needs that IP too
npm run build
npm run lint      # eslint (eslint-config-next core-web-vitals + typescript)

sudo systemctl {status,restart,stop} chatui-frontend   # how it actually runs (frontend/chatui-frontend.service)
```

The deployed frontend is the **`next build` output served by `next start`** under
systemd, not `npm run dev` — so a source change only reaches the browser after
`npm run build && sudo systemctl restart chatui-frontend`. `start` binds the same
Tailscale IP as `dev`. The unit hardcodes the nvm node path
(`~/.nvm/versions/node/v24.18.0/bin/node`) since node isn't in `/usr/bin` here;
after a node upgrade, update `ExecStart`/`PATH` in the unit or it dies with
`status=203/EXEC`. Logs: `frontend/logs/frontend.log`.

No automated test suite on either side — verify by actually running both and driving the app in a browser (login → send a message → confirm it streams and persists).

**`frontend/` has its own `CLAUDE.md`** (just `@AGENTS.md`) pulling in `frontend/AGENTS.md`'s warning that this Next.js version has training-data-breaking changes — read `node_modules/next/dist/docs/` before writing frontend code that assumes older-Next.js APIs/conventions.

## Architecture

`backend/db.py` — SQLite (`chatui.db`, gitignored): `users` (`password_hash` bcrypt, `role`, `vllm_router_api_key` — **never sent to the browser**), `conversations`, `messages`. Same connect-per-call pattern as `vllm-router`'s `auth.py`/`usage.py`.

`backend/vllm_client.py` — the only thing that talks to `vllm-router`: `list_models(user_api_key)`, `stream_chat(user_api_key, model, messages)` (async generator over vLLM's SSE, `aiter_lines()` + `data: ` JSON parsing, yields text deltas), `provision_vllm_user(username)` (`POST {VLLM_ROUTER_URL}/admin/users` with the admin key from `.env`).

`backend/auth.py` — chatui's **own** browser session auth (JWT in an httpOnly cookie), a separate concern from `vllm-router`'s Bearer-token API auth — don't conflate the two. `create_user_sync()` validates the username, generates a login password, calls `vllm_client.provision_vllm_user()` to get that user's own `vllm-router` key, and stores it. JWT `sub` claim **must be a string** (`str(user.id)`, decoded back to `int`) — PyJWT rejects an int subject outright. `require_user`/`require_admin` are FastAPI dependencies reading the `chatui_session` cookie.

`backend/app.py` — routes: `/api/auth/{login,logout,me}`, `/admin/users` (admin-only), `/api/models`, `/api/conversations[/{id}[/messages]]`. The message-send route streams the assistant reply via `StreamingResponse` and only inserts it as a row once the generator completes; if it's the conversation's first message, the title is set from a truncated prefix (no extra LLM call for title generation).

`frontend/app/page.tsx` is the whole chat client component: auth-guards via `GET /api/auth/me`, lists/creates/selects conversations, and streams a send via `fetch` + manual `ReadableStream` reading (not `EventSource`, since the request needs a POST body). **Any code touching this stream-reading loop must wrap it in `try/catch/finally`** — a dropped connection mid-stream with no `finally` leaves `sending` stuck `true` forever (input permanently disabled, no error shown); this already bit this exact loop once. `next.config.ts`'s `rewrites()` proxies `/api/*` to the backend so the browser only ever talks to one origin (no CORS setup) — the frontend never calls `vllm-router` directly.

### Conventions

- **Secrets via `.env`, never hardcoded** — same as every other project in this directory.
- **Backend binds `127.0.0.1`; frontend dev server binds the Tailscale IP, not `0.0.0.0`.** This box has a public IP and picks up scanner/bot traffic on anything listening on all interfaces — the frontend is the one thing that needs to be reachable by an actual remote browser (over Tailscale), everything else is local-only.
- New DB-backed backend state should follow `db.py`'s existing connect-per-call/`asyncio.to_thread` pattern (matching `vllm-router`) rather than introducing a pooled connection or an ORM.
