const { customAlphabet } = require("nanoid");
const DB = require("./db");
const { text } = require("body-parser");

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

// Repository will be used to interact with the database
class Repository {
  
  // async getAllOpenJobs(){
  //   const result = await DB.query({
  //     text: "SELECT * FROM jobs WHERE validity_status = 'open'",
  //   });
  //   return result.rows;
  // }

  async getAllOpenJobs(user_id){
    const result = await DB.query({
      text: `
        SELECT 
            j.job_id,
            j.job_title,
            j.job_experience,
            j.job_location,
            j.company_name,
            j.job_type,
            j.work_type,
            j.salary_min,
            j.salary_max,
            j.job_description,
            j.required_skills,
            j.application_deadline,
            j.validity_status,
            j.created_at,
            j.updated_at,
            CASE 
                WHEN a.application_id IS NOT NULL THEN 'Applied'
                ELSE 'Not Applied'
            END AS application_status
        FROM 
            jobs j
        LEFT JOIN 
            applications a 
        ON 
            j.job_id = a.job_id AND a.applicant_user_id = $1
        WHERE 
            j.validity_status = 'open'
      `,
      values: [user_id], // Replace user_id with the variable containing the user's ID
    });
    
    return result.rows;
  }

// async getFilteredJobs(jobTitle, jobExperience, jobLocations, jobType, workType, salaryMin, requiredSkills) {
//   const filters = [];
//   const values = [];
//   let index = 1; // Dynamic index for query placeholders

//   // Build filters dynamically
//   if (jobTitle) {
//     filters.push(`LOWER(job_title) LIKE '%' || LOWER($${index}) || '%'`);
//     values.push(jobTitle);
//     index++;
//   }
//   if (jobExperience) {
//     filters.push(`LOWER(job_experience) LIKE '%' || LOWER($${index}) || '%'`);
//     values.push(jobExperience);
//     index++;
//   }
//   if (jobLocations) {
//     filters.push(`
//       EXISTS (
//         SELECT 1 FROM UNNEST(job_location) loc 
//         WHERE LOWER(loc) = ANY(ARRAY(SELECT LOWER(val) FROM UNNEST($${index}::TEXT[]) val))
//       )
//     `);
//     values.push(jobLocations);
//     index++;
//   }
//   if (jobType) {
//     filters.push(`job_type = $${index}`);
//     values.push(jobType);
//     index++;
//   }
//   if (workType) {
//     filters.push(`work_type = $${index}`);
//     values.push(workType);
//     index++;
//   }
//   if (salaryMin) {
//     filters.push(`CAST(salary_min AS NUMERIC) >= CAST($${index} AS NUMERIC)`);
//     values.push(salaryMin);
//     index++;
//   }
//   if (requiredSkills) {
//     filters.push(`
//       EXISTS (
//         SELECT 1 FROM UNNEST(required_skills) skill 
//         WHERE LOWER(skill) = ANY(ARRAY(SELECT LOWER(val) FROM UNNEST($${index}::TEXT[]) val))
//       )
//     `);
//     values.push(requiredSkills);
//     index++;
//   }

//   // Base query
//   let queryText = `
//     SELECT *
//     FROM jobs
//     WHERE validity_status = 'open'
//   `;

//   // Append filters if any
//   if (filters.length > 0) {
//     queryText += ` AND ${filters.join(" AND ")}`;
//   }

//   // Order by creation date
//   queryText += " ORDER BY created_at DESC";

//   // Execute query
//   const result = await DB.query({
//     text: queryText,
//     values,
//   });

//   return result.rows;
// }


async getFilteredJobs(
  userId, // Add user ID for application status
  jobTitle,
  jobExperience,
  jobLocations,
  jobType,
  workType,
  salaryMin,
  requiredSkills,
  jobKeywords
) {
  const filters = [];
  const values = [userId]; // Include userId as the first parameter

  // Build filters dynamically
  if (jobTitle) {
    filters.push(`LOWER(j.job_title) LIKE '%' || LOWER($${values.length + 1}) || '%'`);
    values.push(jobTitle);
  }
  if (jobExperience) {
    filters.push(`LOWER(j.job_experience) LIKE '%' || LOWER($${values.length + 1}) || '%'`);
    values.push(jobExperience);
  }
  if (jobLocations) {
    filters.push(`
      EXISTS (
        SELECT 1 FROM UNNEST(j.job_location) loc 
        WHERE LOWER(loc) = ANY(ARRAY(SELECT LOWER(val) FROM UNNEST($${values.length + 1}::TEXT[]) val))
      )
    `);
    values.push(jobLocations);
  }
  if (jobType) {
    filters.push(`j.job_type = $${values.length + 1}`);
    values.push(jobType);
  }
  if (workType) {
    filters.push(`j.work_type = $${values.length + 1}`);
    values.push(workType);
  }
  if (salaryMin) {
    filters.push(`CAST(j.salary_min AS NUMERIC) >= CAST($${values.length + 1} AS NUMERIC)`);
    values.push(salaryMin);
  }
  if (requiredSkills) {
    filters.push(`
      EXISTS (
        SELECT 1 FROM UNNEST(j.required_skills) skill 
        WHERE LOWER(skill) = ANY(ARRAY(SELECT LOWER(val) FROM UNNEST($${values.length + 1}::TEXT[]) val))
      )
    `);
    values.push(requiredSkills);
  }
  if (jobKeywords) {
    filters.push(`
      (
        LOWER(j.job_title) LIKE ANY(ARRAY(SELECT '%' || LOWER(keyword) || '%' FROM UNNEST($${values.length + 1}::TEXT[]) keyword))
        OR LOWER(j.company_name) LIKE ANY(ARRAY(SELECT '%' || LOWER(keyword) || '%' FROM UNNEST($${values.length + 1}::TEXT[]) keyword)) 
        OR EXISTS (
          SELECT 1 FROM UNNEST(j.required_skills) skill 
          WHERE LOWER(skill) LIKE ANY(ARRAY(SELECT '%' || LOWER(keyword) || '%' FROM UNNEST($${values.length + 1}::TEXT[]) keyword))
        )
      )
    `);
    values.push(jobKeywords);
  }

  // Base query
  let queryText = `
    SELECT 
        j.job_id,
        j.job_title,
        j.job_experience,
        j.job_location,
        j.company_name,
        j.job_type,
        j.work_type,
        j.salary_min,
        j.salary_max,
        j.job_description,
        j.required_skills,
        j.application_deadline,
        j.validity_status,
        j.created_at,
        j.updated_at,
        CASE 
            WHEN a.application_id IS NOT NULL THEN 'Applied'
            ELSE 'Not Applied'
        END AS application_status
    FROM 
        jobs j
    LEFT JOIN 
        applications a 
    ON 
        j.job_id = a.job_id AND a.applicant_user_id = $1
    WHERE 
        j.validity_status = 'open'
  `;

  // Append filters if any
  if (filters.length > 0) {
    queryText += ` AND ${filters.join(" AND ")}`;
  }

  // Order by creation date
  queryText += " ORDER BY j.created_at DESC";

  // Execute query
  const result = await DB.query({
    text: queryText,
    values,
  });

  return result.rows;
}



  async createJob({
    user_id,
    job_title,
    job_experience,
    job_location,
    company_name,
    restrict_applicants_country,
    job_type,
    work_type,
    salary_min,
    salary_max,
    job_description,
    required_skills,
    application_deadline,
  }) {
    const id = nanoid();

    const result = await DB.query({
      text: `
        INSERT INTO jobs 
        (job_id,user_id, job_title, job_experience, job_location, company_name, restrict_applicants_country, job_type, work_type, salary_min, salary_max, job_description, required_skills, application_deadline)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13, $14)
        RETURNING *`,
      values: [
        id,
        user_id,
        job_title,
        job_experience,
        job_location,
        company_name,
        restrict_applicants_country,
        job_type,
        work_type,
        salary_min,
        salary_max,
        job_description,
        required_skills,
        application_deadline,
      ],
    });

    return result.rows[0];
  }


  // async getJobById(jobId) {
  //   const result = await DB.query({
  //     text: "SELECT * FROM jobs WHERE job_id = $1",
  //     values: [jobId],
  //   });
  //   return result.rows[0];
  // }

  async getJobById(user_id,job_id) {
    const result = await DB.query({
      text: `SELECT 
    j.job_id,
    j.job_title,
    j.job_experience,
    j.job_location,
    j.company_name,
    j.job_type,
    j.work_type,
    j.salary_min,
    j.salary_max,
    j.job_description,
    j.required_skills,
    j.application_deadline,
    j.validity_status,
    j.created_at,
    j.updated_at,
    CASE 
        WHEN a.application_id IS NOT NULL THEN 'Applied'
        ELSE 'Not Applied'
    END AS application_status
FROM 
    jobs j
LEFT JOIN 
    applications a 
ON 
    j.job_id = a.job_id AND a.applicant_user_id = $1
WHERE 
    j.validity_status = 'open' 
    AND j.job_id = $2;
`,
      values: [user_id,job_id],
    });
    return result.rows[0];
  }


  async getJobByJobId(job_id){
    const result = await DB.query({
      text: "SELECT * FROM jobs WHERE job_id = $1",
      values: [job_id],
    });
    return result.rows[0];
  }

  async deleteJob(job_id) {
    await DB.query({
      text: "DELETE FROM jobs WHERE job_id = $1",
      values: [job_id],
    });
  }


  async updateJob(job_id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const queryText = `UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE job_id = $1 RETURNING *`;

    const result = await DB.query({
      text: queryText,
      values: [job_id, ...values],
    });

    return result.rows[0];
  }

  // async updateJob(
  //   job_id,
  //   user_id,
  //   job_title,
  //   job_experience,
  //   job_location,
  //   restrict_applicants_country,
  //   job_type,
  //   work_type,
  //   salary_min,
  //   salary_max,
  //   job_description,
  //   required_skills,
  //   application_deadline
  // ) {
  //   let updates = [];
  //   let values = [];
  
  //   if (job_title) {
  //     updates.push(`job_title = $${updates.length + 1}`);
  //     values.push(job_title);
  //   }
  //   if (job_experience) {
  //     updates.push(`job_experience = $${updates.length + 1}`);
  //     values.push(job_experience);
  //   }
  //   if (job_location) {
  //     updates.push(`job_location = $${updates.length + 1}`);
  //     values.push(job_location);
  //   }
  //   if (restrict_applicants_country) {
  //     updates.push(`restrict_applicants_country = $${updates.length + 1}`);
  //     values.push(restrict_applicants_country);
  //   }
  //   if (job_type) {
  //     updates.push(`job_type = $${updates.length + 1}`);
  //     values.push(job_type);
  //   }
  //   if (work_type) {
  //     updates.push(`work_type = $${updates.length + 1}`);
  //     values.push(work_type);
  //   }
  //   if (salary_min) {
  //     updates.push(`salary_min = $${updates.length + 1}`);
  //     values.push(salary_min);
  //   }
  //   if (salary_max) {
  //     updates.push(`salary_max = $${updates.length + 1}`);
  //     values.push(salary_max);
  //   }
  //   if (job_description) {
  //     updates.push(`job_description = $${updates.length + 1}`);
  //     values.push(job_description);
  //   }
  //   if (required_skills) {
  //     updates.push(`required_skills = $${updates.length + 1}`);
  //     values.push(required_skills);
  //   }
  //   if (application_deadline) {
  //     updates.push(`application_deadline = $${updates.length + 1}`);
  //     values.push(application_deadline);
  //   }
  
  //   // Ensure job_id is added for WHERE clause
  //   if (!job_id) {
  //     throw new BadRequestError("job_id is required for updates");
  //   }
  //   values.push(job_id);
  
  //   // If no updates are provided, return an error
  //   if (updates.length === 0) {
  //     throw new BadRequestError("No fields provided for update");
  //   }
  
  //   const query = `
  //     UPDATE jobs
  //     SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
  //     WHERE job_id = $${values.length}
  //     RETURNING *;
  //   `;
  
  //   const result = await DB.query({
  //     text: query,
  //     values: values,
  //   });
  
  //   if (result.rows.length === 0) {
  //     throw new NotFoundError("Job not found");
  //   }
  
  //   return result.rows[0];
  // }

  async getAllJobsPostedByUserId(userId) {
    const result = await DB.query({
      text: "SELECT * FROM jobs WHERE user_id = $1",
      values: [userId],
    });
    return result.rows;
  }

  async getAllApplicantsDetails(job_id){
    const result = await DB.query({
      text: "SELECT * FROM applications WHERE job_id = $1 ORDER BY resume_score DESC NULLS LAST",
      values: [job_id],
    });
    return result.rows;
  }


  async updateApplication(application_id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const queryText = `UPDATE applications SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE application_id = $1 RETURNING *`;

    const result = await DB.query({
      text: queryText,
      values: [application_id, ...values],
    });

    return result.rows[0];
}




  //Applicants functions


  async Applicant_applyJob(job_id, user_id,name,email,resume) {
    const id=nanoid();
    const result = await DB.query({
      text: "INSERT INTO applications (application_id,job_id, applicant_user_id,applicant_name,applicant_email,resume_link) VALUES ($1, $2, $3,$4,$5,$6) RETURNING *",
      values: [id,job_id, user_id,name,email,resume],
    });
    return result.rows[0];
  }

   async Applicant_getAllMyJobApplicationsByUserId(user_id) {
    const result = await DB.query({
      text: "SELECT * from applications join jobs on applications.job_id = jobs.job_id where applications.applicant_user_id = $1 ORDER BY applications.created_at DESC",
      values: [user_id],
    });


    return result.rows;
   }


   async getApplicationsByJobId(job_id) {
    const result = await DB.query({
      text: "SELECT * FROM applications WHERE job_id = $1",
      values: [job_id],
    });
    return result.rows;
   }


   async getApplicationById(applicationId) {
    const queryText = `SELECT * FROM applications WHERE application_id = $1`;
    const result = await DB.query({
      text: queryText,
      values: [applicationId],
    });
    return result.rows[0];
  }
  
  async updateApplication(applicationId, updateData) {


    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
  
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const queryText = `
      UPDATE applications 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE application_id = $1 
      RETURNING *`;

    const result = await DB.query({
      text: queryText,
      values: [applicationId, ...values],
    });
  
    return result.rows[0];
  }

  async addExternalApplicant(job_id,firstname,lastname,email,contactnumber,resume_link,externalid){
    const result = await DB.query({
      text: "INSERT INTO externalapplicants (externalid,job_id, firstname,lastname,email,contactnumber,resume_link) VALUES ($1, $2,$3,$4,$5,$6,$7) RETURNING *",
      values: [externalid,job_id,firstname,lastname,email,contactnumber,resume_link],
    });
    return result.rows[0];
  }

  async addExternalApplication(job_id,name,email,resume_link,externalid){
    const id=nanoid();
    const result = await DB.query({
      text: "INSERT INTO applications (application_id,job_id, applicant_user_id,applicant_name,applicant_email,resume_link,application_type) VALUES ($1, $2, $3,$4,$5,$6,$7) RETURNING *",
      values: [id,job_id, externalid,name,email,resume_link,'external'],
    });
    return result.rows[0];

  }

  async scheduleJobInterview(job_id,application_id){

    const id=nanoid();

    const result = await DB.query({
      text: "UPDATE applications SET application_status = 'interviewScheduled',interview_status = 'scheduled',interview_id = $1,updated_at = CURRENT_TIMESTAMP WHERE job_id = $2 AND application_id = $3 RETURNING *;",
      values: [id,job_id,application_id],
    });
    return result.rows[0];
  }

  async addInterviewFeedback(interview_id, transcript, feedback){

      const serializedTranscript = JSON.stringify(transcript);
      const serializedFeedback = JSON.stringify(feedback);
      const result = await DB.query({
        text: `INSERT INTO jobinterviewfeedback (interview_id,transcript,feedback)
          VALUES ($1,$2,$3) RETURNING *`,
        values: [interview_id, serializedTranscript, serializedFeedback],
      });
  
      return result.rows[0];

  }

  async getApplicationByInterviewId(interview_id){

    const result = await DB.query({
      text: "SELECT * FROM applications WHERE interview_id = $1",
      values: [interview_id],
    });
    return result.rows[0];
  }


  // async updateInterviewStatusByInterviewId(interviewId,status)
  // {

  //   const result = await DB.query({
  //     text: "UPDATE applications SET interview_status = $1,updated_at = CURRENT_TIMESTAMP WHERE interview_id = $2 RETURNING *;",
  //     values: [status,interviewId],
  //   });
  //   return result.rows[0];
  // }


  async updateInterviewStatusByInterviewId(interviewId, status) {
    const updateApplicationsQuery = `
      UPDATE applications 
      SET interview_status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE interview_id = $2 
      RETURNING *;
    `;
  
    const updateTalentPoolQuery = `
      UPDATE talentpoolrecommendation 
      SET interview_status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE interview_id = $2 
      RETURNING *;
    `;
  
      // Try updating in applications table first
      const applicationResult = await DB.query({
        text: updateApplicationsQuery,
        values: [status, interviewId],
      });
  
      if (applicationResult.rows.length > 0) {
        return applicationResult.rows[0]; // Return updated row if found in applications
      }
  
      // If not found in applications, update in talentpoolrecommendation table
      const talentPoolResult = await DB.query({
        text: updateTalentPoolQuery,
        values: [status, interviewId],
      });
  
      if (talentPoolResult.rows.length > 0) {
        return talentPoolResult.rows[0]; // Return updated row if found in talentpoolrecommendation
      }
  
      return null; // Return null if interviewId is not found in both tables
    
  }
  

  async updateApplicationStatusByInterviewId(interviewId,status){

    const result = await DB.query({
      text: "UPDATE applications SET application_status = $1,updated_at = CURRENT_TIMESTAMP WHERE interview_id = $2 RETURNING *;",
      values: [status,interviewId],
    });
    return result.rows[0];
  }

  // async updateInterviewScoreByInterviewId(interview_id,ai_interview_score){

  //   const result = await DB.query({
  //     text: "UPDATE applications SET ai_interview_score = $1,updated_at = CURRENT_TIMESTAMP WHERE interview_id = $2 RETURNING *;",
  //     values: [ai_interview_score,interview_id],
  //   });
  //   return result.rows[0];
  // }

  async updateInterviewScoreByInterviewId(interview_id, ai_interview_score) {
    const updateApplicationsQuery = `
      UPDATE applications 
      SET ai_interview_score = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE interview_id = $2 
      RETURNING *;
    `;
  
    const updateTalentPoolQuery = `
      UPDATE talentpoolrecommendation 
      SET ai_interview_score = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE interview_id = $2 
      RETURNING *;
    `;
  
    
      // First, attempt to update in applications table
      const applicationResult = await DB.query({
        text: updateApplicationsQuery,
        values: [ai_interview_score, interview_id],
      });
  
      if (applicationResult.rows.length > 0) {
        return applicationResult.rows[0]; // Return updated row if found in applications
      }
  
      // If not found in applications, attempt to update in talentpoolrecommendation table
      const talentPoolResult = await DB.query({
        text: updateTalentPoolQuery,
        values: [ai_interview_score, interview_id],
      });
  
      if (talentPoolResult.rows.length > 0) {
        return talentPoolResult.rows[0]; // Return updated row if found in talentpoolrecommendation
      }
  
      return null; // Return null if interview_id is not found in both tables
    
  }
  



  // async getJobInterviewByInterviewId(interview_id){

  //   const result = await DB.query({
  //     text: "SELECT * FROM applications WHERE interview_id = $1",
  //     values: [interview_id],
  //   });
  //   return result.rows[0];
  // }

  async getJobInterviewByInterviewId(interview_id) {
    const applicationQuery = `
      SELECT * FROM applications WHERE interview_id = $1
    `;
  
    const talentPoolQuery = `
      SELECT * FROM talentpoolrecommendation WHERE interview_id = $1
    `;
  
    
      // Search in applications table first
      const applicationResult = await DB.query({
        text: applicationQuery,
        values: [interview_id],
      });
  
      if (applicationResult.rows.length > 0) {
        return applicationResult.rows[0]; // Return if found
      }
  
      // If not found in applications, search in talentpoolrecommendation table
      const talentPoolResult = await DB.query({
        text: talentPoolQuery,
        values: [interview_id],
      });
  
      if (talentPoolResult.rows.length > 0) {
        return talentPoolResult.rows[0]; // Return if found
      }
  
      return null; // Return null if not found in both tables
    
  }
  

  async getJobInterviewFeedbackByInterviewId(interview_id){

    const result = await DB.query({
      text: "SELECT * FROM jobinterviewfeedback WHERE interview_id = $1",
      values: [interview_id],
    });
    return result.rows[0];
  }


  async getalreadyscanned(recruiter_id,job_id){

    const result = await DB.query({
      text: "SELECT * FROM talentpoolrecommendation WHERE recruiter_id = $1 AND job_id = $2",
      values: [recruiter_id,job_id],
    });
    return result.rows;
  }


  async addstudentscandetails(job_id,recruiter_id,resume_id,candidate_name,candidate_email,contact_number,city,country,talentpool_type){


    const result = await DB.query({
      text: "INSERT INTO talentpoolrecommendation(job_id,recruiter_id,resume_id,candidate_name,candidate_email,contact_number,city,country,talentpool_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *;",
      values: [job_id,recruiter_id,resume_id,candidate_name,candidate_email,contact_number,city,country,talentpool_type],
    });

    return result.rows[0];
  }

  // async addstudentscandetails(job_id,recruiter_id,resume_id,candidate_name,candidate_email,contact_number,city,country,ai_screening_recommendation,resume_score,talentpool_type){


  //   const result = await DB.query({
  //     text: "INSERT INTO talentpoolrecommendation(job_id,recruiter_id,resume_id,candidate_name,candidate_email,contact_number,city,country,ai_screening_recommendation,resume_score,talentpool_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *;",
  //     values: [job_id,recruiter_id,resume_id,candidate_name,candidate_email,contact_number,city,country,ai_screening_recommendation,resume_score,talentpool_type],
  //   });

  //   return result.rows[0];
  // }


  async updatestudentscandetails(job_id,resume_id,ai_screening_recommendation,resume_score,talentpool_type){

    const result = await DB.query({
      text: "UPDATE talentpoolrecommendation SET ai_screening_recommendation = $1, resume_score = $2 WHERE job_id = $4 AND resume_id = $5 AND talentpool_type = $3 RETURNING *;",
      values: [ai_screening_recommendation,resume_score,talentpool_type,job_id,resume_id],
    });

    return result.rows[0];

  }


  async addstudentscandetailsBatch(studentDataArray) {
    const query = `
      INSERT INTO talentpoolrecommendation(
        job_id, recruiter_id, resume_id, candidate_name, candidate_email,
        contact_number, city, country, ai_screening_recommendation,
        resume_score, talentpool_type
      ) VALUES ${studentDataArray.map((_, i) => `($${i * 11 + 1},$${i * 11 + 2},$${i * 11 + 3},$${i * 11 + 4},$${i * 11 + 5},$${i * 11 + 6},$${i * 11 + 7},$${i * 11 + 8},$${i * 11 + 9},$${i * 11 + 10},$${i * 11 + 11})`).join(", ")}
      RETURNING *;
    `;
  
    const values = studentDataArray.flat();
  
    const result = await DB.query({ text: query, values });
    return result.rows;
  }
  


  async scheduleTalentPoolInterview(job_id,resume_id){

    const id=nanoid();

    const result = await DB.query({
      text: "UPDATE talentpoolrecommendation SET interview_id = $1, interview_status = 'scheduled',updated_at = CURRENT_TIMESTAMP WHERE job_id = $2 AND resume_id = $3 RETURNING *;",    
      values: [id,job_id,resume_id],
    });

    return result.rows[0];
  }


  async getTalentPoolEntryByInterviewId(
    interview_id
  ){

    const result = await DB.query({
      text: "SELECT * FROM talentpoolrecommendation WHERE interview_id = $1",
      values: [interview_id],
    });
    return result.rows[0];
  }



  async getTalentPoolRecommendationByResumeIdandJobId(resume_id,job_id){

    const result = await DB.query({
      text: "SELECT * FROM talentpoolrecommendation WHERE resume_id = $1 AND job_id = $2",
      values: [resume_id,job_id],
    });
    return result.rows[0];
  }

  async deleteTalentPoolRecommendationByResumeIdandJobId(resume_id,job_id){

    const result = await DB.query({
      text: "DELETE FROM talentpoolrecommendation WHERE resume_id = $1 AND job_id = $2",
      values: [resume_id,job_id],
    });
  }


  async moveRecommendedToApplication({job_id,resume_id,candidate_name,candidate_email,ai_screening_recommendation,resume_score,ai_interview_score,interview_id,interview_status}){

    const id=nanoid();

    let application_status="pending";

    if(ai_interview_score){
      application_status="interviewCompleted";
    }else if(interview_id){
      application_status="interviewScheduled";
    }

    const application_type="talentpool";


    const result = await DB.query({
      text: "INSERT INTO applications(application_id,job_id,applicant_user_id,applicant_name,applicant_email,ai_screening_recommendation,resume_score,application_type,ai_interview_score,interview_id,interview_status,application_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *;",
      values: [id,job_id,resume_id,candidate_name,candidate_email,ai_screening_recommendation,resume_score,application_type,ai_interview_score,interview_id,interview_status,application_status],
    });

    return result.rows[0];

  }


  async manualApplicationFix1(){

    console.log("in repo");

    const result = await DB.query({
      text:"select * from applications WHERE resume_score is not null AND ai_screening_recommendation is null",
    });

    return result.rows;

  }

  async manualApplicationFix2(){
    console.log("in repo");

    const result = await DB.query({
      text:"select * from applications WHERE resume_score is null AND application_type = 'internal' order by created_at desc limit 10",
    });

    return result.rows;
  }


  
}

module.exports = Repository;


























// const result = await DB.query({
//   text: `
//     SELECT 
//         *
//     FROM 
//         jobs
//     WHERE 
//         validity_status = 'open' -- Ensure only open jobs are returned
//         AND($1::TEXT IS NULL OR LOWER(job_title) LIKE '%' || LOWER($1::TEXT) || '%') -- Match job title (case-insensitive)
//         AND ($2::TEXT IS NULL OR LOWER(job_experience) LIKE '%' || LOWER($2::TEXT) || '%') -- Match job experience (case-insensitive)
//         AND ($3::TEXT[] IS NULL OR EXISTS (
//             SELECT 1 FROM UNNEST(job_location) loc WHERE LOWER(loc) = ANY(ARRAY(SELECT LOWER(val) FROM UNNEST($3::TEXT[]) val))
//         )) -- Match job location
//         AND ($4::JOB_TYPE IS NULL OR job_type = $4::JOB_TYPE) -- Match job type
//         AND ($5::WORK_TYPE IS NULL OR work_type = $5::WORK_TYPE) -- Match work type
//         AND ($6::VARCHAR IS NULL OR CAST(salary_min AS NUMERIC) >= CAST($6 AS NUMERIC)) -- Match salary minimum
//         AND ($7::TEXT[] IS NULL OR EXISTS (
//             SELECT 1 FROM UNNEST(required_skills) skill WHERE LOWER(skill) = ANY(ARRAY(SELECT LOWER(val) FROM UNNEST($7::TEXT[]) val))
//         )) -- Match required skills
//     ORDER BY created_at DESC
//   `,
//   values: [
//     jobTitle,             // $1: Filter for job title
//     jobExperience,        // $2: Filter for job experience
//     jobLocations,         // $3: Array of locations to match
//     jobType,              // $4: Job type filter
//     workType,             // $5: Work type filter
//     salaryMin,            // $6: Minimum salary filter
//     requiredSkills        // $7: Array of skills to match
//   ],
// });
