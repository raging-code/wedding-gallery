-- Wedding Gallery Social — reactions + comments
-- Run with:
--   npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql
--   npx wrangler d1 execute wedding-gallery-social --file=./d1-schema.sql --remote

CREATE TABLE IF NOT EXISTS reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  media_key   TEXT    NOT NULL,          -- B2 object key (stable identifier)
  reaction    TEXT    NOT NULL,          -- '❤️' | '👏' | '💍' | '😍' | '🥂'
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_reactions_key ON reactions(media_key);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  media_key   TEXT    NOT NULL,
  author_name TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_comments_key ON comments(media_key);
