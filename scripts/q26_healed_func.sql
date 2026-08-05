-- Finn funksjoner som inneholder 'healed' eller setter status='active'
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc ILIKE '%healed%' OR prosrc ILIKE '%status = ''active''%'
ORDER BY proname;
