import time
import os
from typing import AsyncGenerator, Dict, Any, Optional
from groq import Groq, AsyncGroq

SUPPORTED_MODELS = {
    "llama-3.3-70b-versatile": {"context_window": 128000, "description": "Llama 3.3 70B - Versatile"},
    "llama-3.1-8b-instant": {"context_window": 131072, "description": "Llama 3.1 8B - Fast"},
    "deepseek-r1-distill-llama-70b": {"context_window": 128000, "description": "DeepSeek R1 Distill - Reasoning"},
}

_sync_client: Groq | None = None
_async_client: AsyncGroq | None = None


def get_sync_client() -> Groq:
    global _sync_client
    if _sync_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        _sync_client = Groq(api_key=api_key)
    return _sync_client


def get_async_client() -> AsyncGroq:
    global _async_client
    if _async_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        _async_client = AsyncGroq(api_key=api_key)
    return _async_client


def chat_completion(
    prompt: str,
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 2048,
    top_p: float = 0.9,
    system_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    client = get_sync_client()
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    start = time.perf_counter()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    usage = response.usage
    return {
        "content": response.choices[0].message.content,
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
        "response_time_ms": round(elapsed_ms, 2),
        "model": response.model,
    }


async def stream_chat_completion(
    prompt: str,
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 2048,
    top_p: float = 0.9,
    system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    client = get_async_client()
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


def get_available_models() -> list:
    return [
        {"id": model_id, "description": info["description"], "context_window": info["context_window"]}
        for model_id, info in SUPPORTED_MODELS.items()
    ]
