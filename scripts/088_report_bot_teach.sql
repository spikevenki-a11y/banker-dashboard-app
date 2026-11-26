-- 088_report_bot_teach.sql — phrases the bank teaches the report bot, + ignored-word logging.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS report_bot_phrases (
  id          BIGSERIAL PRIMARY KEY,
  branch_id   BIGINT,                       -- NULL = every branch
  phrase      VARCHAR(80) NOT NULL,         -- what users type (stored lower-case)
  kind        VARCHAR(10) NOT NULL CHECK (kind IN ('rewrite', 'synonym', 'value')),
  rewrite_to  VARCHAR(200),                 -- rewrite: replacement text
  dataset     VARCHAR(40),                  -- synonym / value: report key (loans, deposits, …)
  field       VARCHAR(40),                  -- synonym (optional) / value: field key
  op          VARCHAR(10),                  -- value: = != > < >= <= ILIKE NOT ILIKE
  value       VARCHAR(200),                 -- value: compared value
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_bot_phrases_branch ON report_bot_phrases (branch_id) WHERE is_active;

-- the log now also keeps which words were not understood
ALTER TABLE report_bot_log ADD COLUMN IF NOT EXISTS ignored_words TEXT[] DEFAULT '{}';

-- Starter phrases for Tamil Nadu co-operative banks (edit / delete from the teach screen)
INSERT INTO report_bot_phrases (branch_id, phrase, kind, rewrite_to, dataset, field, op, value, created_by)
SELECT * FROM (VALUES
  (NULL::bigint, 'kcc',            'rewrite', 'crop loan',          NULL, NULL, NULL, NULL, 'seed'),
  (NULL,         'nagai kadan',    'rewrite', 'gold loan',          NULL, NULL, NULL, NULL, 'seed'),
  (NULL,         'payir kadan',    'rewrite', 'crop loan',          NULL, NULL, NULL, NULL, 'seed'),
  (NULL,         'பயிர் கடன்',     'rewrite', 'crop loan',          NULL, NULL, NULL, NULL, 'seed'),
  (NULL,         'நகை கடன்',       'rewrite', 'gold loan',          NULL, NULL, NULL, NULL, 'seed'),
  (NULL,         'arrear list',    'synonym', NULL,                 'loans', NULL, NULL, NULL, 'seed'),
  (NULL,         'defaulters',     'value',   NULL,                 'loans', 'overdue_amount', '>', '0', 'seed'),
  (NULL,         'sub standard',   'value',   NULL,                 'loans', 'overdue_bucket', '=', '91-180 days', 'seed'),
  (NULL,         'senior citizen', 'value',   NULL,                 'deposits', 'interest_category', 'ILIKE', '%SENIOR%', 'seed')
) v(branch_id, phrase, kind, rewrite_to, dataset, field, op, value, created_by)
WHERE NOT EXISTS (SELECT 1 FROM report_bot_phrases);
