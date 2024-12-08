DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE Application_Status AS ENUM ('pending', 'accepted', 'rejected','testScheduled','interviewScheduled');
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
    ai_interview_score DECIMAL(3, 2) DEFAULT NULL,
    application_status Application_Status DEFAULT 'pending',
    resume_link VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


