import asyncio
from typing import List, Dict, Any

from app.services.llm_service import chat_completion, stream_chat_completion


def search_web(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    try:
        from ddgs import DDGS
        results = list(DDGS().text(query, max_results=max_results))
        return results
    except Exception:
        return []


def _build_web_prompt(query: str, results: List[Dict[str, Any]]) -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%A, %d %B %Y, %H:%M UTC")

    if not results:
        return (
            f"TODAY'S DATE: {today_str}\n\n"
            "No web search results were found.\n\n"
            f"QUESTION: {query}\n\n"
            "Please inform the user that no external results were found."
        )

    context_parts = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "")
        url = r.get("href", "")
        body = r.get("body", "")
        context_parts.append(f"[Web Source {i}: {title}]\nURL: {url}\n{body}")

    context = "\n\n---\n\n".join(context_parts)

    return (
        "You are answering a question using live web search results. "
        "Use ONLY the information in these results to answer. "
        "You MUST state clearly that this answer is based on external internet sources, not the user's documents.\n"
        f"TODAY'S DATE: {today_str}\n\n"
        f"WEB SEARCH RESULTS:\n{context}\n\n"
        f"QUESTION: {query}\n\n"
        "ANSWER (start your response with: '🌐 Based on external web sources:'):"
    )


def web_search_and_answer(
    query: str,
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 2048,
    top_p: float = 0.9,
) -> Dict[str, Any]:
    results = search_web(query)
    sources = [{"title": r.get("title", ""), "url": r.get("href", "")} for r in results]

    if not results:
        return {
            "content": "🌐 I searched the web but could not find relevant results for your question.",
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "response_time_ms": 0.0,
            "sources": [],
            "from_web": True,
        }

    prompt = _build_web_prompt(query, results)
    result = chat_completion(
        prompt=prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    result["sources"] = sources
    result["from_web"] = True
    return result


async def web_search_prompt_async(query: str) -> tuple[str, List[Dict[str, Any]]]:
    """Run web search in thread pool and return (prompt, sources)."""
    results = await asyncio.to_thread(search_web, query)
    sources = [{"title": r.get("title", ""), "url": r.get("href", "")} for r in results]
    prompt = _build_web_prompt(query, results)
    return prompt, sources
