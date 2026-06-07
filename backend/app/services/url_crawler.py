"""
Website crawler with Playwright (JS rendering) + requests fallback.
Strategy:
  1. Try sitemap.xml for a complete URL list.
  2. BFS-crawl pages using Playwright headless Chromium (handles React / Vue / Angular sites).
  3. Fall back to requests + BeautifulSoup if Playwright is not available.
"""

import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from typing import List, Set

SKIP_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp", ".bmp",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
    ".mp4", ".mp3", ".wav", ".avi", ".mov",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
    ".xml", ".json", ".csv", ".xlsx", ".xls",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _clean_url(url: str) -> str:
    p = urlparse(url)
    return (p.scheme + "://" + p.netloc + p.path).rstrip("/")


def _same_domain(url: str, base_domain: str) -> bool:
    netloc = urlparse(url).netloc
    return netloc == base_domain or netloc == f"www.{base_domain}" or netloc == ""


def _skip_url(url: str) -> bool:
    ext = Path(urlparse(url).path).suffix.lower()
    return ext in SKIP_EXTENSIONS


def _extract_text(html: str, page_url: str) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise tags
    for tag in soup(["script", "style", "noscript", "iframe",
                     "nav", "footer", "header", "aside", "head"]):
        tag.decompose()

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Prefer semantic main content containers
    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id=re.compile(r"(content|main)", re.I))
        or soup.find(attrs={"class": re.compile(r"(content|main|page)", re.I)})
        or soup.body
    )
    body_text = main.get_text(separator="\n", strip=True) if main else ""
    body_text = re.sub(r"\n{3,}", "\n\n", body_text).strip()

    if not body_text or len(body_text) < 50:
        return ""

    header = f"[PAGE: {page_url}]"
    if title:
        header += f"\nTitle: {title}"
    return f"{header}\n\n{body_text}"


def _get_sitemap_urls(base_url: str) -> List[str]:
    """Try to fetch all page URLs from sitemap.xml / sitemap_index.xml."""
    import requests
    from bs4 import BeautifulSoup

    candidates = [
        urljoin(base_url, "/sitemap.xml"),
        urljoin(base_url, "/sitemap_index.xml"),
        urljoin(base_url, "/sitemap/sitemap.xml"),
        urljoin(base_url, "/page-sitemap.xml"),
    ]
    urls: List[str] = []
    for sm_url in candidates:
        try:
            resp = requests.get(sm_url, headers=HEADERS, timeout=10)
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "lxml-xml")
            locs = soup.find_all("loc")
            if locs:
                urls = [loc.get_text(strip=True) for loc in locs]
                break
        except Exception:
            continue
    return urls


# ──────────────────────────────────────────────────────────────────────────────
# Playwright crawler (JS rendering)
# ──────────────────────────────────────────────────────────────────────────────

def _crawl_with_playwright(start_url: str, max_pages: int) -> str:
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

    parsed = urlparse(start_url)
    base_domain = parsed.netloc.lstrip("www.")

    visited: Set[str] = set()
    parts: List[str] = []

    # Seed the queue: prefer sitemap URLs so we get the full site structure
    sitemap_urls = _get_sitemap_urls(start_url)
    queue: List[str] = sitemap_urls[:max_pages] if sitemap_urls else [start_url]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        context = browser.new_context(
            user_agent=HEADERS["User-Agent"],
            viewport={"width": 1280, "height": 800},
            java_script_enabled=True,
            ignore_https_errors=True,
        )

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            clean = _clean_url(url)

            if clean in visited or _skip_url(clean):
                continue
            visited.add(clean)

            try:
                page = context.new_page()
                # domcontentloaded is faster than networkidle; we then wait for
                # a short timeout to let the JS framework hydrate the DOM.
                page.goto(url, wait_until="domcontentloaded", timeout=20_000)
                # Extra wait for SPA hydration
                page.wait_for_timeout(2000)

                # Dismiss common cookie / GDPR banners
                for selector in [
                    "button:has-text('Accept')",
                    "button:has-text('Accept All')",
                    "button:has-text('OK')",
                    "[id*='cookie'] button",
                ]:
                    try:
                        btn = page.locator(selector).first
                        if btn.is_visible(timeout=500):
                            btn.click(timeout=500)
                    except Exception:
                        pass

                html = page.content()
                text = _extract_text(html, url)
                if text:
                    parts.append(text)

                # If we came from a sitemap we already have all URLs; otherwise
                # discover internal links from the rendered page.
                if not sitemap_urls:
                    hrefs = page.eval_on_selector_all(
                        "a[href]", "els => els.map(e => e.href)"
                    )
                    for href in hrefs:
                        href = href.strip()
                        if not href or href.startswith(("mailto:", "tel:", "javascript:")):
                            continue
                        if _same_domain(href, base_domain):
                            candidate = _clean_url(href)
                            if candidate not in visited:
                                queue.append(href)

                page.close()

            except (PwTimeout, Exception):
                try:
                    page.close()
                except Exception:
                    pass
                continue

        browser.close()

    if not parts:
        raise ValueError(f"Playwright extracted no usable content from {start_url}")

    separator = "\n\n" + "=" * 60 + "\n\n"
    return separator.join(parts)


# ──────────────────────────────────────────────────────────────────────────────
# requests + BeautifulSoup fallback (static sites)
# ──────────────────────────────────────────────────────────────────────────────

def _crawl_with_requests(start_url: str, max_pages: int, delay: float) -> str:
    import requests

    parsed = urlparse(start_url)
    base_domain = parsed.netloc.lstrip("www.")

    visited: Set[str] = set()
    queue = _get_sitemap_urls(start_url)[:max_pages] or [start_url]
    parts: List[str] = []

    while queue and len(visited) < max_pages:
        url = queue.pop(0)
        clean = _clean_url(url)
        if clean in visited or _skip_url(clean):
            continue
        visited.add(clean)

        try:
            resp = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True)
            if "text/html" not in resp.headers.get("Content-Type", ""):
                continue

            text = _extract_text(resp.text, url)
            if text:
                parts.append(text)

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                    continue
                absolute = urljoin(url, href)
                if _same_domain(absolute, base_domain):
                    candidate = _clean_url(absolute)
                    if candidate not in visited:
                        queue.append(absolute)

        except Exception:
            continue

        if delay > 0:
            time.sleep(delay)

    if not parts:
        raise ValueError(f"requests crawler extracted no content from {start_url}")

    separator = "\n\n" + "=" * 60 + "\n\n"
    return separator.join(parts)


# ──────────────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────────────

def crawl_website(start_url: str, max_pages: int = 50, delay: float = 0.3) -> str:
    """
    Crawl a website and return all extracted text, ready for chunking.
    Uses Playwright (JS rendering) with a requests+BS4 fallback.
    """
    if not start_url.startswith(("http://", "https://")):
        raise ValueError(f"Invalid URL: {start_url}")

    try:
        return _crawl_with_playwright(start_url, max_pages)
    except Exception as pw_err:
        try:
            return _crawl_with_requests(start_url, max_pages, delay)
        except Exception as req_err:
            raise ValueError(
                f"Both crawlers failed.\nPlaywright: {pw_err}\nRequests: {req_err}"
            )
