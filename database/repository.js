const { customAlphabet } = require("nanoid");
const DB = require("./db");

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

// Repository will be used to interact with the database
class Repository {
  
  async getAllOpenJobs(){
    const result = await DB.query({
      text: "SELECT * FROM jobs WHERE validity_status = 'open'",
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
    console.log("Heoolo");
    const formatArrayForPG = (arr) => `{${arr.map((item) => `"${item}"`).join(',')}}`;

    const Job_Location = formatArrayForPG(job_location);
    const Restrict_Applicants_Country = formatArrayForPG(restrict_applicants_country);
    const Required_Skills = formatArrayForPG(required_skills);


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
        Job_Location,
        Restrict_Applicants_Country,
        job_type,
        work_type,
        salary_min,
        salary_max,
        job_description,
        Required_Skills,
        application_deadline,
      ],
    });

    console.log(result.rows);

    return result.rows[0];
  }


  async getJobById(jobId) {
    const result = await DB.query({
      text: "SELECT * FROM jobs WHERE job_id = $1",
      values: [jobId],
    });
    return result.rows[0];
  }

  async deleteJob(jobId) {
    await DB.query({
      text: "DELETE FROM jobs WHERE job_id = $1",
      values: [jobId],
    });
  }


  async updateJob(jobId, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const queryText = `UPDATE jobs SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE job_id = $1 RETURNING *`;

    const result = await DB.query({
      text: queryText,
      values: [jobId, ...values],
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


  async Applicant_applyJob(jobId, userId,name,email,resume) {
    const id=nanoid();
    const result = await DB.query({
      text: "INSERT INTO applications (application_id,job_id, applicant_user_id,applicant_name,applicant_email,resume_link) VALUES ($1, $2, $3,$4,$5,$6) RETURNING *",
      values: [id,jobId, userId,name,email,resume],
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




  
}

module.exports = Repository;
