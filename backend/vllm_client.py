import json
import os
from typing import AsyncIterator, Dict, List

import httpx
from dotenv import load_dotenv

load_dotenv()

VLLM_ROUTER_URL = os.environ.get("VLLM_ROUTER_URL", "http://localhost:8001")
VLLM_ROUTER_ADMIN_KEY = os.environ.get("VLLM_ROUTER_ADMIN_KEY", "")


async def list_models(user_api_key: str) -> List[str]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{VLLM_ROUTER_URL}/v1/models",
            headers={"Authorization": f"Bearer {user_api_key}"},
        )
        response.raise_for_status()
    return [item["id"] for item in response.json().get("data", [])]


async def stream_chat(user_api_key: str, model: str, messages: List[Dict]) -> AsyncIterator[str]:
    body = {"model": model, "messages": messages, "stream": True}
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
                "POST", f"{VLLM_ROUTER_URL}/v1/chat/completions",
                json=body, headers={"Authorization": f"Bearer {user_api_key}"},
                ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[len("data: "):].strip()
                if not payload or payload == "[DONE]":
                    continue
                try:
                    chunk = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                choices = chunk.get("choices") or []
                if choices:
                    delta = choices[0].get("delta", {}).get("content")
                    if delta:
                        yield delta


async def provision_vllm_user(username: str) -> str:
    if not VLLM_ROUTER_ADMIN_KEY:
        raise RuntimeError("VLLM_ROUTER_ADMIN_KEY is not set")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{VLLM_ROUTER_URL}/admin/users",
            json={"name": username, "role": "user"},
            headers={"Authorization": f"Bearer {VLLM_ROUTER_ADMIN_KEY}"},
        )
    if response.status_code != 200:
        detail = response.json().get("error", response.text)
        raise ValueError(f"vllm-router rejected user provisioning: {detail}")
    return response.json()["api_key"]
