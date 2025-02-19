DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'talentpool_type') THEN
        CREATE TYPE TalentPool_Type AS ENUM ('internal', 'external');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_status') THEN
        CREATE TYPE interview_status AS ENUM ('NA','scheduled', 'running', 'completed');
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS talentpoolrecommendation (  
    job_id VARCHAR(12) NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    recruiter_id VARCHAR(12) NOT NULL,  
    resume_id VARCHAR(12) NOT NULL,
    candidate_name VARCHAR(255),
    candidate_email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    city VARCHAR(50),
    country VARCHAR(50), 
    ai_screening_recommendation Boolean DEFAULT NULL,
    resume_score DECIMAL(3, 2) DEFAULT NULL,
    ai_interview_score DECIMAL(3, 2) DEFAULT NULL,
    talentpool_type TalentPool_Type DEFAULT 'internal',
    interview_id VARCHAR(12) DEFAULT NULL,
    interview_status interview_status DEFAULT 'NA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);


