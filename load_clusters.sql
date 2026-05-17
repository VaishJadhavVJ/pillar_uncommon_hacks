#!/usr/bin/env python3
"""Read clustered_articles.json and generate insert_clusters.sql."""

import json
from pathlib import Path

CLUSTERED_PATH = Path("clustered_articles.json")
OUTPUT_PATH = Path("insert_clusters.sql")

OUTLET_IDS = {
    "BBC": 301,
    "WaPo": 302,
    "Guardian": 303,
    "Al Jazeera": 304,
    "Fox News": 305,
    "CNBC": 306,
}

CLUSTER_IDS = {
    "ISIS kill": 1,
    "Ebola": 2,
    "Taiwan": 3,
    "UK Labour": 4,
    "London marches": 5,
}


def _sql_string(value: str) -> str:
    return value.replace("'", "''")


def _enrichments_json(
    headline: str, url: str, summary: str, outlet_id: int, cluster_id: int
) -> str:
    return json.dumps(
        {
            "headline": headline,
            "url": url,
            "summary": summary,
            "outlet_id": outlet_id,
            "cluster_id": cluster_id,
        },
        ensure_ascii=False,
    )


def generate_insert_sql(clusters: list[dict]) -> str:
    rows: list[dict] = []
    for cluster in clusters:
        topic = cluster["topic"]
        cluster_id = CLUSTER_IDS[topic]
        for article in cluster["articles"]:
            outlet = article["outlet"]
            outlet_id = OUTLET_IDS[outlet]
            rows.append(
                {
                    "headline": article["headline"],
                    "url": article["url"],
                    "summary": article["summary"],
                    "outlet_id": outlet_id,
                    "cluster_id": cluster_id,
                }
            )

    lines = [
        "-- Generated from clustered_articles.json",
        f"-- {len(rows)} rows",
        "",
    ]

    for row in rows:
        headline_sql = _sql_string(row["headline"])
        enrichments = _enrichments_json(
            row["headline"],
            row["url"],
            row["summary"],
            row["outlet_id"],
            row["cluster_id"],
        )
        lines.append(
            "INSERT INTO PILLAR.MAIN.stories (headline, event_date, status, enrichments)\n"
            f"VALUES (\n"
            f"  '{headline_sql}',\n"
            f"  CURRENT_TIMESTAMP(),\n"
            f"  'raw',\n"
            f"  PARSE_JSON($${enrichments}$$)\n"
            f");\n"
        )

    return "\n".join(lines)


def main() -> None:
    data = json.loads(CLUSTERED_PATH.read_text(encoding="utf-8"))
    sql = generate_insert_sql(data["clusters"])
    OUTPUT_PATH.write_text(sql, encoding="utf-8")
    count = sql.count("INSERT INTO")
    print(f"Wrote {count} INSERT statements to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
