# TheEntryLevelDevJobsAreD

> An app responding to: "The entry level dev jobs are disappearing."

**Slug:** `the-entry-level-dev-jobs-are-d`

## Pitch
This MVP responds to the trend "The entry level dev jobs are disappearing." picked up from r/webdev. It does one thing well.

## Target user
Indie hackers, early adopters interested in this trend.

## Core feature
Single-feature app. Replace this stub with the LLM-generated spec by setting ANTHROPIC_API_KEY.

## Monetization
Free for the first N uses, then $9/mo or $99 one-time.

## Data model
### `items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | → auth.users |
| `title` | `text` |  |
| `body` | `text` |  |
| `created_at` | `timestamptz` | default `now()` |

**RLS:** Users see only their own rows.

## Routes

| Path | Purpose |
|---|---|
| `/` | landing + login |
| `/app` | main feature, auth required |
| `/api/items` | CRUD endpoint |

## Stretch features (not for MVP)

- Search
- Tags
- Export
