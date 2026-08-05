SELECT created_at, error_type, error_message, component_name, page_url
FROM client_errors
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
