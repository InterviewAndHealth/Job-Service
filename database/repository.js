const { customAlphabet } = require("nanoid");
const DB = require("./db");

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
        (job_id,user_id, job_title, job_experience, job_location, restrict_applicants_country, job_type, work_type, salary_min, salary_max, job_description, required_skills, application_deadline)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13)
        RETURNING *`,
      values: [
        id,
        user_id,
        job_title,
        job_experience,
        job_location,
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
      text: "SELECT * FROM applications WHERE job_id = $1",
      values: [job_id],
    });
    return result.rows;
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
      text: "SELECT * from applications join jobs on applications.job_id = jobs.job_id where applications.applicant_user_id = $1",
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
      text: "INSERT INTO externalapplicants (,externalid,job_id, firstname,lastname,email,contactnumber,resume_link) VALUES ($1, $2,$3,$4,$5,$6,$7) RETURNING *",
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
