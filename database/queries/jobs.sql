DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
        CREATE TYPE JOB_TYPE AS ENUM ('Full-time', 'Part-time', 'Contract', 'Internship');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_type') THEN
        CREATE TYPE WORK_TYPE AS ENUM ('Remote', 'On-site', 'Hybrid');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
    job_id VARCHAR(12) PRIMARY KEY,  
    user_id VARCHAR(12) NOT NULL,  
    job_title VARCHAR(255) NOT NULL,
    job_level VARCHAR(50) NOT NULL,
    job_location VARCHAR(255) NOT NULL,
    restrict_applicants_country VARCHAR(50)[] DEFAULT NULL,  
    job_type JOB_TYPE NOT NULL,  
    work_type WORK_TYPE NOT NULL,  
    salary_min INTEGER NOT NULL, 
    salary_max INTEGER NOT NULL,  
    job_description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
