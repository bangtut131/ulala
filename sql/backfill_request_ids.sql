-- Backfill request_id with case-insensitive and strict matching
-- This captures "Staff Warehouse " (with space) or "staff warehouse"

UPDATE candidates c
SET request_id = sub.mr_id
FROM (
    SELECT jv.title, jv.manpower_request_id as mr_id
    FROM job_vacancies jv
) sub
WHERE 
    (c.request_id IS NULL) AND
    (
        TRIM(LOWER(c.position)) = TRIM(LOWER(sub.title)) OR
        c.position ILIKE '%' || sub.title || '%' 
    );
