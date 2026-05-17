# Pillar — The Fourth Estate, Mapped

Same story. Different owners. Hear who's really telling it.

**Live demo:** https://pillarnews.lovable.app

## What is Pillar?

A real-time news transparency platform that maps today's news as a living constellation, showing who owns each outlet and letting you hear the same story through multiple ownership lenses.

## Architecture

- **Snowflake** — data warehouse, Cortex LLM summarization, entity extraction, category classification
- **ElevenLabs** — distinct voice personas per outlet
- **React + Lovable** — constellation frontend
- **Python** — RSS ingestion pipeline

## Snowflake Schema

```sql
CREATE TABLE outlets (outlet_id, outlet_name, parent_company, ownership_details, rss_url, country);
CREATE TABLE stories (story_id, headline, event_date, status, enrichments VARIANT);
```

## Branches

- **frontend** — React constellation UI
- **backend** — Python pipeline and RSS ingestion
