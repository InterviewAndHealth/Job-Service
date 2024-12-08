DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
        CREATE TYPE JOB_TYPE AS ENUM ('Full-time', 'Part-time', 'Contract', 'Internship');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_type') THEN
        CREATE TYPE WORK_TYPE AS ENUM ('Remote', 'On-site', 'Hybrid');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'validity_status_type') THEN
        CREATE TYPE validity_status_type AS ENUM ('open', 'pause', 'close');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
    job_id VARCHAR(12) PRIMARY KEY,  
    user_id VARCHAR(12) NOT NULL,  
    job_title VARCHAR(255) NOT NULL,
    job_experience VARCHAR(50) NOT NULL,  
    job_location VARCHAR(255)[] NOT NULL, 
    restrict_applicants_country VARCHAR(50)[] DEFAULT NULL,  
    job_type JOB_TYPE NOT NULL,  
    work_type WORK_TYPE NOT NULL,  
    salary_min VARCHAR(50) NOT NULL,       
    salary_max VARCHAR(50) NOT NULL,       
    job_description TEXT NOT NULL,
    required_skills VARCHAR(255)[] NOT NULL,  
    application_deadline DATE DEFAULT NULL,
    validity_status validity_status_type DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
