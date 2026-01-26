-- Create RPC function to increment vacancy views safely
-- SECURITY DEFINER allows it to run with admin privileges to bypass RLS

CREATE OR REPLACE FUNCTION increment_vacancy_view(row_id UUID)
RETURNS VOID 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_vacancies
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_vacancy_view(UUID) TO anon, authenticated, service_role;
