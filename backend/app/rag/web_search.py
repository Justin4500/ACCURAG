import logging
from typing import List, Dict, Any
from urllib.parse import parse_qs, urlparse, unquote
import httpx
from lxml import html

logger = logging.getLogger("accurate_ai.web_search")

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class WebSearchEngine:
    """Performs real-time web searches to ground questions not answered in user documents."""

    @staticmethod
    def search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        query = query.strip()
        if not query:
            return []

        # 1. Primary method: Direct HTML DuckDuckGo search (fast, robust, unblocked)
        try:
            with httpx.Client(headers=DEFAULT_HEADERS, timeout=6.0, follow_redirects=True) as client:
                resp = client.post("https://html.duckduckgo.com/html/", data={"q": query})
                if resp.status_code == 200 and resp.text:
                    tree = html.fromstring(resp.text)
                    result_elements = tree.xpath('//div[contains(@class, "result ")]')

                    results = []
                    for el in result_elements:
                        title_nodes = el.xpath('.//a[contains(@class, "result__a")]')
                        snippet_nodes = el.xpath('.//a[contains(@class, "result__snippet")]')

                        if not title_nodes:
                            continue

                        title = title_nodes[0].text_content().strip()
                        raw_href = title_nodes[0].get("href", "")

                        # Unpack /l/?uddg=<actual_url> redirect format
                        clean_url = raw_href
                        if "uddg=" in raw_href:
                            try:
                                parsed = parse_qs(urlparse(raw_href).query)
                                if "uddg" in parsed:
                                    clean_url = unquote(parsed["uddg"][0])
                            except Exception:
                                pass

                        domain = ""
                        if clean_url:
                            try:
                                domain = urlparse(clean_url).netloc.replace("www.", "")
                            except Exception:
                                domain = clean_url

                        snippet = snippet_nodes[0].text_content().strip() if snippet_nodes else ""

                        if title and clean_url and not clean_url.startswith("/"):
                            results.append({
                                "title": title,
                                "url": clean_url,
                                "body": snippet,
                                "domain": domain,
                            })

                        if len(results) >= max_results:
                            break

                    if results:
                        logger.info(f"WebSearchEngine returned {len(results)} live results for '{query}'")
                        return results
        except Exception as e:
            logger.warning(f"DuckDuckGo HTML search attempt failed for '{query}': {e}")

        # 2. Secondary fallback: ddgs package
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                raw_results = list(ddgs.text(query, max_results=max_results))

            results = []
            for item in raw_results:
                title = item.get("title", "Web Source")
                href = item.get("href", "")
                body = item.get("body", "")

                domain = ""
                if href:
                    try:
                        domain = urlparse(href).netloc.replace("www.", "")
                    except Exception:
                        domain = href

                results.append({
                    "title": title,
                    "url": href,
                    "body": body,
                    "domain": domain,
                })

            if results:
                logger.info(f"DDGS fallback returned {len(results)} results for '{query}'")
                return results
        except Exception as e:
            logger.error(f"All web search methods failed for '{query}': {e}")

        return []
