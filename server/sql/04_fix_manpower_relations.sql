-- Fix Candidate to Manpower Relation
ALTER TABLE candidates
DROP CONSTRAINT IF EXISTS fk_candidates_manpower;

ALTER TABLE candidates
ADD CONSTRAINT fk_candidates_manpower
FOREIGN KEY (request_id) 
REFERENCES manpower_requests(id)
ON DELETE SET NULL;

NOTIFY pgrst, 'reload config';
