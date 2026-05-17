import json
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any

FEEDS = {
    "BBC": "https://feeds.bbci.co.uk/news/rss.xml",
    "WaPo": "https://feeds.washingtonpost.com/rss/world",
    "Guardian": "https://www.theguardian.com/world/rss",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
    "Fox News": "https://moxie.foxnews.com/google-publisher/world.xml",
    "CNBC": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
}

ARTICLES_PER_OUTLET = 15
OUTPUT_PATH = "articles.json"
USER_AGENT = "PillarRSSFetcher/1.0"
TIMEOUT_SECONDS = 30


def _local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def _text(element: ET.Element | None) -> str:
    if element is None:
        return ""
    return "".join(element.itertext()).strip()


def _find_child(parent: ET.Element, name: str) -> ET.Element | None:
    for child in parent:
        if _local_name(child.tag) == name:
            return child
    return None


def _find_children(parent: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in parent if _local_name(child.tag) == name]


def _entry_link(entry: ET.Element) -> str:
    for child in entry:
        if _local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href", "").strip()
        if href:
            rel = child.attrib.get("rel", "alternate").strip()
            if rel in ("", "alternate"):
                return href
    for child in entry:
        if _local_name(child.tag) == "link":
            href = child.attrib.get("href", "").strip()
            if href:
                return href
    link_el = _find_child(entry, "link")
    return _text(link_el)


def _entry_summary(entry: ET.Element) -> str:
    for name in ("summary", "description", "content"):
        el = _find_child(entry, name)
        text = _text(el)
        if text:
            return text
    return ""


def _parse_rss_items(channel: ET.Element) -> list[dict[str, str]]:
    articles: list[dict[str, str]] = []
    for item in _find_children(channel, "item"):
        headline = _text(_find_child(item, "title"))
        url = _text(_find_child(item, "link"))
        summary = _entry_summary(item)
        if headline and url:
            articles.append({"headline": headline, "url": url, "summary": summary})
        if len(articles) >= ARTICLES_PER_OUTLET:
            break
    return articles


def _parse_atom_entries(root: ET.Element) -> list[dict[str, str]]:
    articles: list[dict[str, str]] = []
    entries = _find_children(root, "entry")
    if not entries:
        for el in root.iter():
            if _local_name(el.tag) == "entry":
                entries.append(el)
    for entry in entries:
        headline = _text(_find_child(entry, "title"))
        url = _entry_link(entry)
        summary = _entry_summary(entry)
        if headline and url:
            articles.append({"headline": headline, "url": url, "summary": summary})
        if len(articles) >= ARTICLES_PER_OUTLET:
            break
    return articles


def _parse_feed(xml_bytes: bytes) -> list[dict[str, str]]:
    root = ET.fromstring(xml_bytes)
    tag = _local_name(root.tag)

    if tag == "rss":
        channel = _find_child(root, "channel")
        if channel is not None:
            return _parse_rss_items(channel)
        return []

    if tag == "feed":
        return _parse_atom_entries(root)

    channel = _find_child(root, "channel")
    if channel is not None:
        return _parse_rss_items(channel)

    return _parse_atom_entries(root)


def fetch_feed(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def fetch_all_articles() -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for outlet, url in FEEDS.items():
        print(f"Fetching {outlet}...")
        try:
            xml_bytes = fetch_feed(url)
            items = _parse_feed(xml_bytes)
        except Exception as exc:
            print(f"  Failed: {exc}")
            items = []

        for item in items[:ARTICLES_PER_OUTLET]:
            results.append(
                {
                    "outlet": outlet,
                    "headline": item["headline"],
                    "url": item["url"],
                    "summary": item["summary"],
                }
            )
        print(f"  Got {min(len(items), ARTICLES_PER_OUTLET)} article(s)")
    return results


def save_articles(articles: list[dict[str, str]], path: str = OUTPUT_PATH) -> None:
    with open(path, "w", encoding="utf-8") as file:
        json.dump(articles, file, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    articles = fetch_all_articles()
    save_articles(articles)
    print(f"\nSaved {len(articles)} articles to {OUTPUT_PATH}")
