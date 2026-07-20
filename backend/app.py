import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import vllm_client
from auth import (
    COOKIE_NAME, User, create_session_token, create_user, require_admin, require_user, verify_login,
)
from db import connect, now

MAX_ATTACHMENTS_PER_MESSAGE = 5


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect().close()  # ensure tables exist before serving
    yield


app = FastAPI(lifespan=lifespan)


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    role: str = "user"


class CreateConversationRequest(BaseModel):
    model: Optional[str] = None


class AttachmentIn(BaseModel):
    filename: str = Field(max_length=255)
    content: str = Field(max_length=200_000)


class PostMessageRequest(BaseModel):
    content: str
    attachments: List[AttachmentIn] = []


class EditMessageRequest(BaseModel):
    content: str
    attachments: Optional[List[AttachmentIn]] = None


@app.post("/api/auth/login")
async def login(payload: LoginRequest, response: Response):
    user = await verify_login(payload.username, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_session_token(user)
    response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="lax", max_age=7 * 24 * 3600)
    return {"username": user.username, "role": user.role}


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@app.get("/api/auth/me")
async def me(user: User = Depends(require_user)):
    return {"username": user.username, "role": user.role}


@app.post("/admin/users")
async def admin_create_user(payload: CreateUserRequest, admin: User = Depends(require_admin)):
    try:
        password = await create_user(payload.username, role=payload.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"username": payload.username, "role": payload.role, "password": password}


def _list_users_sync() -> List[dict]:
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT id, username, role, created_at FROM users ORDER BY id ASC",
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@app.get("/admin/users")
async def admin_list_users(admin: User = Depends(require_admin)):
    return {"users": await asyncio.to_thread(_list_users_sync)}


@app.get("/api/models")
async def list_models(user: User = Depends(require_user)):
    return {"models": await vllm_client.list_models(user.vllm_router_api_key)}


@app.get("/api/usage")
async def get_usage(user: User = Depends(require_user)):
    return {"usage": await vllm_client.get_usage(user.vllm_router_api_key, user.username)}


def _list_conversations_sync(user_id: int) -> List[dict]:
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT id, title, model, created_at FROM conversations WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@app.get("/api/conversations")
async def list_conversations(user: User = Depends(require_user)):
    return {"conversations": await asyncio.to_thread(_list_conversations_sync, user.id)}


def _create_conversation_sync(user_id: int, model: Optional[str]) -> int:
    conn = connect()
    try:
        cur = conn.execute(
            "INSERT INTO conversations (user_id, title, model, created_at) VALUES (?, 'New chat', ?, ?)",
            (user_id, model, now()),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


@app.post("/api/conversations")
async def create_conversation(payload: CreateConversationRequest, user: User = Depends(require_user)):
    conversation_id = await asyncio.to_thread(_create_conversation_sync, user.id, payload.model)
    return {"id": conversation_id}


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _make_snippet(content: str, query: str, radius: int = 60) -> str:
    idx = content.lower().find(query.lower())
    if idx == -1:
        return content[:160]
    start = max(0, idx - radius)
    end = min(len(content), idx + len(query) + radius)
    snippet = content[start:end]
    if start > 0:
        snippet = "…" + snippet
    if end < len(content):
        snippet = snippet + "…"
    return snippet


def _search_conversations_sync(user_id: int, q: str) -> List[dict]:
    pattern = f"%{_escape_like(q)}%"
    conn = connect()
    try:
        rows = conn.execute(
            """
            SELECT c.id, c.title, c.model, c.created_at,
                   (SELECT m.content FROM messages m
                    WHERE m.conversation_id = c.id AND m.content LIKE ? ESCAPE '\\'
                    ORDER BY m.id ASC LIMIT 1) AS matched_content
            FROM conversations c
            WHERE c.user_id = ?
              AND EXISTS (
                SELECT 1 FROM messages m2
                WHERE m2.conversation_id = c.id AND m2.content LIKE ? ESCAPE '\\'
              )
            ORDER BY c.id DESC
            LIMIT 50
            """,
            (pattern, user_id, pattern),
        ).fetchall()
        results = []
        for row in rows:
            d = dict(row)
            matched = d.pop("matched_content") or ""
            d["snippet"] = _make_snippet(matched, q)
            results.append(d)
        return results
    finally:
        conn.close()


@app.get("/api/conversations/search")
async def search_conversations(q: str, user: User = Depends(require_user)):
    q = q.strip()
    if not q:
        return {"results": []}
    return {"results": await asyncio.to_thread(_search_conversations_sync, user.id, q)}


def _attachments_by_message_sync(conn, message_ids: List[int]) -> dict:
    if not message_ids:
        return {}
    placeholders = ",".join("?" for _ in message_ids)
    rows = conn.execute(
        f"SELECT message_id, filename, content FROM attachments "
        f"WHERE message_id IN ({placeholders}) ORDER BY id ASC",
        message_ids,
    ).fetchall()
    by_message: dict = {}
    for row in rows:
        by_message.setdefault(row["message_id"], []).append(
            {"filename": row["filename"], "content": row["content"]},
        )
    return by_message


def _get_conversation_sync(conversation_id: int, user_id: int) -> Optional[dict]:
    conn = connect()
    try:
        conv = conn.execute(
            "SELECT id, title, model, created_at FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        ).fetchone()
        if conv is None:
            return None
        messages = conn.execute(
            "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
        message_dicts = [dict(m) for m in messages]
        by_message = _attachments_by_message_sync(conn, [m["id"] for m in message_dicts])
        for m in message_dicts:
            m["attachments"] = by_message.get(m["id"], [])
        return {**dict(conv), "messages": message_dicts}
    finally:
        conn.close()


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: int, user: User = Depends(require_user)):
    conversation = await asyncio.to_thread(_get_conversation_sync, conversation_id, user.id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    for m in conversation["messages"]:
        m["attachments"] = [{"filename": a["filename"]} for a in m["attachments"]]
    return conversation


def _delete_conversation_sync(conversation_id: int, user_id: int) -> bool:
    conn = connect()
    try:
        cur = conn.execute(
            "DELETE FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id),
        )
        conn.execute(
            "DELETE FROM attachments WHERE message_id IN "
            "(SELECT id FROM messages WHERE conversation_id = ?)",
            (conversation_id,),
        )
        conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, user: User = Depends(require_user)):
    deleted = await asyncio.to_thread(_delete_conversation_sync, conversation_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


def _insert_message_sync(conversation_id: int, role: str, content: str) -> int:
    conn = connect()
    try:
        cur = conn.execute(
            "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, now()),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def _insert_attachments_sync(message_id: int, attachments: List[dict]):
    if not attachments:
        return
    conn = connect()
    try:
        conn.executemany(
            "INSERT INTO attachments (message_id, filename, content, created_at) VALUES (?, ?, ?, ?)",
            [(message_id, a["filename"], a["content"], now()) for a in attachments],
        )
        conn.commit()
    finally:
        conn.close()


def _render_for_llm(content: str, attachments: List[dict]) -> str:
    if not attachments:
        return content
    blocks = "\n\n".join(
        f"--- Attached file: {a['filename']} ---\n{a['content']}\n--- End of {a['filename']} ---"
        for a in attachments
    )
    return f"{content}\n\n{blocks}" if content else blocks


def _maybe_set_title_sync(conversation_id: int, content: str, attachments: List[dict]):
    conn = connect()
    try:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", (conversation_id,),
        ).fetchone()
        if row["n"] == 1:  # this was the first message
            title = content.strip()[:40] or (attachments[0]["filename"] if attachments else "New chat")
            conn.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))
            conn.commit()
    finally:
        conn.close()


@app.post("/api/conversations/{conversation_id}/messages")
async def post_message(conversation_id: int, payload: PostMessageRequest, user: User = Depends(require_user)):
    if not payload.content.strip() and not payload.attachments:
        raise HTTPException(status_code=400, detail="Message is empty")
    if len(payload.attachments) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise HTTPException(status_code=400, detail="Too many attachments")

    conversation = await asyncio.to_thread(_get_conversation_sync, conversation_id, user.id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conversation.get("model"):
        raise HTTPException(status_code=400, detail="Conversation has no model selected")

    attachments = [a.model_dump() for a in payload.attachments]
    new_message_id = await asyncio.to_thread(_insert_message_sync, conversation_id, "user", payload.content)
    await asyncio.to_thread(_insert_attachments_sync, new_message_id, attachments)
    await asyncio.to_thread(_maybe_set_title_sync, conversation_id, payload.content, attachments)

    history = [
        {"role": m["role"], "content": _render_for_llm(m["content"], m["attachments"])}
        for m in conversation["messages"]
    ]
    history.append({"role": "user", "content": _render_for_llm(payload.content, attachments)})

    async def body_iter():
        full_reply = []
        async for delta in vllm_client.stream_chat(user.vllm_router_api_key, conversation["model"], history):
            full_reply.append(delta)
            yield delta
        await asyncio.to_thread(_insert_message_sync, conversation_id, "assistant", "".join(full_reply))

    return StreamingResponse(body_iter(), media_type="text/plain")


def _edit_message_sync(
    conversation_id: int, user_id: int, message_id: int, content: str, attachments: Optional[List[dict]],
) -> Optional[dict]:
    conn = connect()
    try:
        conv = conn.execute(
            "SELECT model FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id),
        ).fetchone()
        if conv is None:
            return None
        msg = conn.execute(
            "SELECT id FROM messages WHERE id = ? AND conversation_id = ? AND role = 'user'",
            (message_id, conversation_id),
        ).fetchone()
        if msg is None:
            return None

        conn.execute("UPDATE messages SET content = ? WHERE id = ?", (content, message_id))

        if attachments is not None:
            conn.execute("DELETE FROM attachments WHERE message_id = ?", (message_id,))
            if attachments:
                conn.executemany(
                    "INSERT INTO attachments (message_id, filename, content, created_at) VALUES (?, ?, ?, ?)",
                    [(message_id, a["filename"], a["content"], now()) for a in attachments],
                )

        conn.execute(
            "DELETE FROM attachments WHERE message_id IN "
            "(SELECT id FROM messages WHERE conversation_id = ? AND id > ?)",
            (conversation_id, message_id),
        )
        conn.execute(
            "DELETE FROM messages WHERE conversation_id = ? AND id > ?", (conversation_id, message_id),
        )

        is_first = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND id < ?",
            (conversation_id, message_id),
        ).fetchone()["n"] == 0
        if is_first:
            title = content.strip()[:40] or "New chat"
            conn.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))

        conn.commit()

        history_rows = conn.execute(
            "SELECT id, role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC", (conversation_id,),
        ).fetchall()
        history_dicts = [dict(row) for row in history_rows]
        by_message = _attachments_by_message_sync(conn, [m["id"] for m in history_dicts])
        history = [
            {"role": m["role"], "content": _render_for_llm(m["content"], by_message.get(m["id"], []))}
            for m in history_dicts
        ]
        return {"model": conv["model"], "history": history}
    finally:
        conn.close()


@app.put("/api/conversations/{conversation_id}/messages/{message_id}")
async def edit_message(
    conversation_id: int, message_id: int, payload: EditMessageRequest, user: User = Depends(require_user),
):
    attachments = [a.model_dump() for a in payload.attachments] if payload.attachments is not None else None
    result = await asyncio.to_thread(
        _edit_message_sync, conversation_id, user.id, message_id, payload.content, attachments,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if not result["model"]:
        raise HTTPException(status_code=400, detail="Conversation has no model selected")

    history = result["history"]

    async def body_iter():
        full_reply = []
        async for delta in vllm_client.stream_chat(user.vllm_router_api_key, result["model"], history):
            full_reply.append(delta)
            yield delta
        await asyncio.to_thread(_insert_message_sync, conversation_id, "assistant", "".join(full_reply))

    return StreamingResponse(body_iter(), media_type="text/plain")
