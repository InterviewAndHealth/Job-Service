DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE Application_Status AS ENUM ('pending', 'accepted', 'rejected','testScheduled','interviewScheduled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_type') THEN
        CREATE TYPE Application_Type AS ENUM ('internal', 'external');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_status') THEN
        CREATE TYPE interview_status AS ENUM ('NA','scheduled', 'running', 'completed');
    END IF;
END $$;


CREATE TABLE IF NOT EXISTS applications (
    application_id VARCHAR(12) PRIMARY KEY,  
    job_id VARCHAR(12) NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,  
    applicant_user_id VARCHAR(12) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL, 
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_screening_recommendation Boolean DEFAULT NULL,
    resume_score DECIMAL(3, 2) DEFAULT NULL,
    ai_interview_score DECIMAL(3, 2) DEFAULT NULL,
    application_status Application_Status DEFAULT 'pending',
    resume_link VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    application_type Application_Type DEFAULT 'internal',
    interview_id VARCHAR(12) DEFAULT NULL,
    interview_status interview_status DEFAULT 'NA',
);


