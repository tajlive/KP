SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%error%' OR table_name ILIKE '%alert%' OR table_name ILIKE '%log%' OR table_name ILIKE '%guard%')
ORDER BY table_name;
