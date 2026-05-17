import json

import snowflake.connector

from fetch_rss import fetch_all_articles, save_articles

CONNECTION_PARAMS = {
    "account": "SFEDUCATIONSERVICES7-DBB14277",
    "user": "LEARNER",
    "password": "Snowflakevaishnavi@5",
    "role": "TRAINING_ROLE",
    "warehouse": "PILLAR_WH",
    "database": "PILLAR",
    "schema": "MAIN",
    "authenticator": "username_password_mfa",
}

OUTLET_IDS = {
    "BBC": 301,
    "WaPo": 302,
    "Guardian": 303,
    "Al Jazeera": 304,
    "Fox News": 305,
    "CNBC": 306,
}

INSERT_SQL = """
INSERT INTO PILLAR.MAIN.stories (headline, event_date, status, enrichments)
SELECT %s, CURRENT_TIMESTAMP(), 'raw', PARSE_JSON(%s)
"""


def connect() -> snowflake.connector.SnowflakeConnection:
    return snowflake.connector.connect(
        **CONNECTION_PARAMS,
        passcode=input("Enter your 6-digit TOTP code: "),
    )


def insert_articles(
    conn: snowflake.connector.SnowflakeConnection, articles: list[dict[str, str]]
) -> int:
    inserted = 0
    cursor = conn.cursor()
    try:
        for article in articles:
            outlet = article["outlet"]
            outlet_id = OUTLET_IDS.get(outlet)
            if outlet_id is None:
                raise KeyError(f"No outlet_id mapping for outlet: {outlet!r}")

            enrichments = json.dumps(
                {
                    "outlet_id": outlet_id,
                    "url": article["url"],
                    "summary": article["summary"],
                },
                ensure_ascii=False,
            )
            cursor.execute(
                INSERT_SQL,
                (article["headline"], enrichments),
            )
            inserted += 1
    finally:
        cursor.close()
    return inserted


def run_pipeline() -> None:
    print("Fetching RSS feeds...")
    articles = fetch_all_articles()
    save_articles(articles)
    print(f"Fetched {len(articles)} article(s)\n")

    print("Connecting to Snowflake...")
    conn = connect()
    try:
        print("Inserting articles into PILLAR.MAIN.stories...")
        inserted = insert_articles(conn, articles)
        conn.commit()
    finally:
        conn.close()

    print(f"\nInserted {inserted} article(s) into PILLAR.MAIN.stories")


if __name__ == "__main__":
    run_pipeline()
