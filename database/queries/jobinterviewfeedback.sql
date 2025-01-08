CREATE TABLE IF NOT EXISTS jobinterviewfeedback (
    interview_id VARCHAR(255) NOT NULL UNIQUE,
    transcript JSONB DEFAULT '[]'::jsonb,
    feedback JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);