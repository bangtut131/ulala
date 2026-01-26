-- Create columns for detailed weighted scores
ALTER TABLE analyses 
ADD COLUMN cv_score INTEGER DEFAULT 0,
ADD COLUMN disc_score INTEGER DEFAULT 0,
ADD COLUMN aptitude_score INTEGER DEFAULT 0,
ADD COLUMN personal_data_score INTEGER DEFAULT 0;
