import asyncio
import os
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request

import vllm_client
from db import connect, now

load_dotenv()

JWT_SECRET = os.environ.get("CHATUI_JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
JWT_TTL = timedelta(days=7)
COOKIE_NAME = "chatui_session"

_username_re = re.compile(r"^[a-z0-9_-]{3,32}$")


@dataclass
class User:
    id: int
    username: str
    role: str
    vllm_router_api_key: str


def validate_username(username: str):
    if not _username_re.match(username):
        raise ValueError(
            "invalid username - must be 3-32 characters, lowercase letters/digits/underscore/hyphen only")


def create_user_sync(username: str, role: str = "user") -> str:
    """Creates a chatui user (and a matching vllm-router user). Returns the generated login password."""
    validate_username(username)
    conn = connect()
    try:
        if conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
            raise ValueError(f"user '{username}' already exists")
        vllm_router_api_key = asyncio.run(vllm_client.provision_vllm_user(username))
        password = secrets.token_urlsafe(16)
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        conn.execute(
            "INSERT INTO users (username, password_hash, role, vllm_router_api_key, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (username, password_hash, role, vllm_router_api_key, now()),
        )
        conn.commit()
        return password
    finally:
        conn.close()


async def create_user(username: str, role: str = "user") -> str:
    return await asyncio.to_thread(create_user_sync, username, role)


def _verify_login_sync(username: str, password: str) -> Optional[User]:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, role, vllm_router_api_key FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if row is None:
            return None
        if not bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
            return None
        return User(id=row["id"], username=row["username"], role=row["role"],
                    vllm_router_api_key=row["vllm_router_api_key"])
    finally:
        conn.close()


async def verify_login(username: str, password: str) -> Optional[User]:
    return await asyncio.to_thread(_verify_login_sync, username, password)


def _get_user_by_id_sync(user_id: int) -> Optional[User]:
    conn = connect()
    try:
        row = conn.execute(
            "SELECT id, username, role, vllm_router_api_key FROM users WHERE id = ?", (user_id,),
        ).fetchone()
        return User(**dict(row)) if row else None
    finally:
        conn.close()


async def get_user_by_id(user_id: int) -> Optional[User]:
    return await asyncio.to_thread(_get_user_by_id_sync, user_id)


def create_session_token(user: User) -> str:
    payload = {"sub": str(user.id), "exp": datetime.now(timezone.utc) + JWT_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_user(request: Request) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = await get_user_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


async def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    return user
