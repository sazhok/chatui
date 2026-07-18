import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import vllm_client
from auth import (
    COOKIE_NAME, User, create_session_token, create_user, require_admin, require_user, verify_login,
)
from db import connect, now


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


class PostMessageRequest(BaseModel):
    content: str


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


@app.get("/api/models")
async def list_models(user: User = Depends(require_user)):
    return {"models": await vllm_client.list_models(user.vllm_router_api_key)}


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
            "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
        return {**dict(conv), "messages": [dict(m) for m in messages]}
    finally:
        conn.close()


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: int, user: User = Depends(require_user)):
    conversation = await asyncio.to_thread(_get_conversation_sync, conversation_id, user.id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def _insert_message_sync(conversation_id: int, role: str, content: str):
    conn = connect()
    try:
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, now()),
        )
        conn.commit()
    finally:
        conn.close()


def _maybe_set_title_sync(conversation_id: int, content: str):
    conn = connect()
    try:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", (conversation_id,),
        ).fetchone()
        if row["n"] == 1:  # this was the first message
            title = content.strip()[:40]
            conn.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))
            conn.commit()
    finally:
        conn.close()


@app.post("/api/conversations/{conversation_id}/messages")
async def post_message(conversation_id: int, payload: PostMessageRequest, user: User = Depends(require_user)):
    conversation = await asyncio.to_thread(_get_conversation_sync, conversation_id, user.id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conversation.get("model"):
        raise HTTPException(status_code=400, detail="Conversation has no model selected")

    await asyncio.to_thread(_insert_message_sync, conversation_id, "user", payload.content)
    await asyncio.to_thread(_maybe_set_title_sync, conversation_id, payload.content)

    history = [{"role": m["role"], "content": m["content"]} for m in conversation["messages"]]
    history.append({"role": "user", "content": payload.content})

    async def body_iter():
        full_reply = []
        async for delta in vllm_client.stream_chat(user.vllm_router_api_key, conversation["model"], history):
            full_reply.append(delta)
            yield delta
        await asyncio.to_thread(_insert_message_sync, conversation_id, "assistant", "".join(full_reply))

    return StreamingResponse(body_iter(), media_type="text/plain")
