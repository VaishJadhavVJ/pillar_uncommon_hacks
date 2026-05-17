#!/usr/bin/env python3
"""Read articles.json and generate insert_stories.sql for PILLAR.MAIN.stories."""

import json
from pathlib import Path

ARTICLES_PATH = Path("articles.json")
OUTPUT_PATH = Path("insert_stories.sql")

# Map RSS outlet names to PILLAR.MAIN.outlets.outlet_id (adjust if your table differs).
OUTLET_IDS = {
    "BBC": 301,
    "WaPo": 302,
    "Guardian": 303,
    "Al Jazeera": 304,
    "Fox News": 305,
    "CNBC": 306,
}


def _sql_string(value: str) -> str:
    return value.replace("'", "''")


def _enrichments_json(outlet: str, url: str, summary: str) -> str:
    outlet_id = OUTLET_IDS.get(outlet)
    if outlet_id is None:
        raise KeyError(f"No outlet_id mapping for outlet: {outlet!r}")
    return json.dumps(
        {"outlet_id": outlet_id, "url": url, "summary": summary},
        ensure_ascii=False,
    )


def generate_insert_sql(articles: list[dict]) -> str:
    lines = [
        "-- Generated from articles.json",
        f"-- {len(articles)} rows",
        "",
    ]

    for article in articles:
        headline = _sql_string(article["headline"])
        enrichments = _enrichments_json(
            article["outlet"], article["url"], article["summary"]
        )

        lines.append(
            "INSERT INTO PILLAR.MAIN.stories (headline, event_date, status, enrichments)\n"
            f"VALUES (\n"
            f"  '{headline}',\n"
            f"  CURRENT_TIMESTAMP(),\n"
            f"  'raw',\n"
            f"  PARSE_JSON($${enrichments}$$)\n"
            f");\n"
        )

    return "\n".join(lines)


def main() -> None:
    articles = json.loads(ARTICLES_PATH.read_text(encoding="utf-8"))
    sql = generate_insert_sql(articles)
    OUTPUT_PATH.write_text(sql, encoding="utf-8")
    print(f"Wrote {len(articles)} INSERT statements to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
