const bcrypt = require("bcrypt");
const { Repository } = require("../database");
const {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} = require("../utils/errors");
const { EventService, RPCService } = require("./broker");
const {
  SERVICE_QUEUE,
  EVENT_TYPES,
  TEST_QUEUE,
  TEST_RPC,
  USERS_QUEUE,
  USERS_RPC,
  RESUME_RPC,
  RESUME_QUEUE,
  TALENTPOOL_QUEUE,
  TALENTPOOL_RPC,
} = require("../config");
const { RPC_TYPES, PAYMENT_RPC, MY_APP_FRONTEND_URL } = require("../config");
const {
  getSignedUrlForRead,
  getInternalSignedUrlForRead,
  getTalentPoolSignedUrlForRead,
} = require("../config/awsconfig");

const sendEmail = require("../utils/mail");

// Service will contain all the business logic
class Service {
  constructor() {
    this.repository = new Repository();
  }

  async getAllOpenJobs(user_id) {
    const jobs = await this.repository.getAllOpenJobs(user_id);
    if (!jobs) throw new NotFoundError("No jobs found");

    return {
      message: "Jobs fetched successfully",
      jobs,
    };
  }

  async getFilteredJobs(
    userId,
    jobTitle,
    jobExperience,
    jobLocations,
    jobType,
    workType,
    salaryMin,
    requiredSkills,
    jobKeywords
  ) {
    const jobs = await this.repository.getFilteredJobs(
      userId,
      jobTitle,
      jobExperience,
      jobLocations,
      jobType,
      workType,
      salaryMin,
      requiredSkills,
      jobKeywords
    );
    if (!jobs) throw new NotFoundError("No jobs found");
    return {
      message: "Jobs fetched successfully",
      jobs,
    };
  }

  async getJobById(user_id, job_id) {
    const job = await this.repository.getJobById(user_id, job_id);
    if (!job) throw new NotFoundError("Job not found");
    return job;
  }

  async createJob(jobData) {
    const recruiter_data = await RPCService.request(USERS_RPC, {
      type: RPC_TYPES.GET_RECRUITER_DETAILS,
      data: {
        userId: jobData.user_id,
      },
    });

    if (!recruiter_data) throw new NotFoundError("Recruiter not found");

    const company_name = recruiter_data.profile.company_name;

    jobData.company_name = company_name;

    const job = await this.repository.createJob(jobData);
    if (!job) throw new InternalServerError("Failed to create job");
    return {
      message: "Job created successfully",
      job,
    };
  }

  async deleteJob(job_id) {
    const job = await this.repository.getJobByJobId(job_id);
    if (!job) throw new NotFoundError("Job not found");

    await this.repository.deleteJob(job_id);

    return {
      message: "Job deleted successfully",
    };
  }

  async updateJob(job_id, updateData) {
    const job = await this.repository.getJobByJobId(job_id);
    if (!job) throw new NotFoundError("Job not found");

    const updatedJob = await this.repository.updateJob(job_id, updateData);
    if (!updatedJob) throw new InternalServerError("Failed to update job");
    return {
      message: "Job updated successfully",
      updatedJob,
    };
  }

  async getAllMyJobsPostings(userId) {
    const jobs = await this.repository.getAllJobsPostedByUserId(userId);
    if (!jobs) throw new NotFoundError("No jobs found");
    return jobs;
  }

  async getAllApplicantsDetails(job_id) {
    const applicants = await this.repository.getAllApplicantsDetails(job_id);

    return {
      message: "Applicants details fetched successfully",
      applicants,
    };
  }

  async updateApplication(application_id, updateData) {
    const applicationId = application_id;
    const application = await this.repository.getApplicationById(applicationId);
    if (!application) throw new NotFoundError("Application not found");

    const updatedApplication = await this.repository.updateApplication(
      application_id,
      updateData
    );
    if (!updatedApplication)
      throw new InternalServerError("Failed to update application");

    return {
      message: "Application updated successfully",
      updatedApplication,
    };
  }

  //Applicants functions

  async Applicant_applyJob(job_id, user_id) {
    const job = await this.repository.getJobById(user_id, job_id);

    // console.log(job);
    if (!job) throw new NotFoundError("Job not found");

    // console.log(job.validity_status);

    if (job.validity_status != "open") {
      throw new BadRequestError("Job is not open for applications");
    }

    if (job.application_status == "Applied") {
      throw new BadRequestError("You have already applied for this job");
    }

    const userDetails = await RPCService.request(USERS_RPC, {
      type: RPC_TYPES.GET_APPLICANT_DETAILS,
      data: {
        userId: user_id,
      },
    });

    // console.log(userDetails);
    if (!userDetails) throw new NotFoundError("Applicant Details not found");

    const email = userDetails.user.email;
    const name =
      userDetails.profile.firstname + " " + userDetails.profile.lastname;
    const resume = userDetails.profile.resumelink;

    const result = await this.repository.Applicant_applyJob(
      job_id,
      user_id,
      name,
      email,
      resume
    );

    // console.log(result);

    if (!result) throw new InternalServerError("Failed to apply job");

    EventService.publish(TALENTPOOL_QUEUE, {
      type: "APPLY_JOB",
      data: {
        resume_id: resume?.split("/").pop().split(".").shift(),
        recruiter_id: job.user_id,
        name,
        email,
      },
    });

    const job_description = job.job_description;

    const resumeevaluation = await RPCService.request(RESUME_RPC, {
      type: RPC_TYPES.GET_RESUME_SCORE,
      data: {
        resume: userDetails.signedUrl,
        job_description: job_description,
      },
    });

    console.log(resumeevaluation);

    const applicationId = result.application_id;

    if (!resumeevaluation) {
      EventService.publish(RESUME_QUEUE, {
        type: "GENERATE_RESUME_SCORE",
        data: {
          id: `${job_id}-${applicationId}-Applicant`,
          job_description: job_description,
          resume: userDetails.signedUrl,
        },
      });
    }

    let ai_screening_recommendation = false;

    if (resumeevaluation.score >= 75) {
      ai_screening_recommendation = true;
    }

    const updateData = {
      resume_score: resumeevaluation.score,
      ai_screening_recommendation,
    };

    // const temp=this.repository.updateApplication(result.application_id,{resume_score:resumeevaluation.score});
    const temp = await this.repository.updateApplication(
      applicationId,
      updateData
    );

    return {
      message: "Job applied successfully",
      result,
    };
  }

  async Applicant_getAllMyJobApplications(user_id) {
    const applications =
      await this.repository.Applicant_getAllMyJobApplicationsByUserId(user_id);
    return {
      message: "Applications fetched successfully",
      applications,
    };
  }

  async getApplicationsByJobId(job_id) {
    const applications = await this.repository.getApplicationsByJobId(job_id);

    if (!applications) throw new NotFoundError("No applications found");

    const ApplicantDetails = await RPCService.request(USERS_RPC, {
      type: RPC_TYPES.GET_APPLICANT_RESUMES,
      data: {
        applications: applications,
      },
    });

    return {
      message: "Applications fetched successfully",
      ApplicantDetails,
    };
  }

  async updateApplications(updates) {
    const results = await Promise.all(
      updates.map(async (update) => {
        const { application_id, ...updateData } = update;

        if (!application_id) {
          throw new Error("Missing application_id in update object.");
        }

        const application = await this.repository.getApplicationById(
          application_id
        );
        if (!application)
          throw new NotFoundError(
            `Application with ID ${application_id} not found`
          );

        const updatedApplication = await this.repository.updateApplication(
          application_id,
          updateData
        );
        return updatedApplication;
      })
    );

    return {
      message: "Applications updated successfully",
      results,
    };
  }

  async addExternalApplicant(
    job_id,
    firstname,
    lastname,
    email,
    contactnumber,
    resume_link,
    externalid
  ) {
    const result = await this.repository.addExternalApplicant(
      job_id,
      firstname,
      lastname,
      email,
      contactnumber,
      resume_link,
      externalid
    );

    return {
      message: "Applicant added successfully",
      result,
    };
  }

  async addExternalApplication(
    job_id,
    firstname,
    lastname,
    email,
    resume_link,
    externalid
  ) {
    const name = firstname + " " + lastname;

    const result = await this.repository.addExternalApplication(
      job_id,
      name,
      email,
      resume_link,
      externalid
    );

    const job = await this.repository.getJobByJobId(job_id);

    const job_description = job.job_description;

    const signedUrl = await getSignedUrlForRead(`${externalid}.pdf`);

    const resumeevaluation = await RPCService.request(RESUME_RPC, {
      type: RPC_TYPES.GET_RESUME_SCORE,
      data: {
        resume: signedUrl,
        job_description: job_description,
      },
    });

    const applicationId = result.application_id;
    let ai_screening_recommendation = false;

    if (resumeevaluation.score >= 75) {
      ai_screening_recommendation = true;
    }

    const updateData = {
      resume_score: resumeevaluation.score,
      ai_screening_recommendation,
    };

    const temp = await this.repository.updateApplication(
      applicationId,
      updateData
    );

    return {
      message: "Application added successfully",
      result,
    };
  }

  // async sendInterviewEmail(email, interview_id, user_id) {
  //   const interviewLink = `${MY_APP_FRONTEND_URL}/job-interview-instructions/?userId=${user_id}&interviewId=${interview_id}`;
  //   const options = {
  //       to: email,
  //       subject: "Your Job Interview Schedule with IamreadyAI",
  //       html: `
  //       <html>
  //         <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; color: #333; padding: 20px;">
  //           <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
  //             <h2 style="color: #4CAF50; text-align: center;">Your Job Interview Details</h2>
  //             <p style="font-size: 16px; line-height: 1.5;">
  //               Dear Candidate,
  //             </p>
  //             <p style="font-size: 16px; line-height: 1.5;">
  //               Congratulations! Your job interview has been scheduled. We are excited to help you achieve your career goals. Please use the link below to join the interview at the scheduled time:
  //             </p>
  //             <div style="text-align: center; margin: 20px 0;">
  //               <a href="${interviewLink}" target="_blank" style="background-color: #4CAF50; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
  //                 Join Your Interview
  //               </a>
  //             </div>
  //             <div style="background-color: #f9f9f9; padding: 10px; margin-top: 20px; border-left: 4px solid #4CAF50; font-size: 16px;">
  //               <strong>Interview Link:</strong><br>
  //               <a href="${interviewLink}" target="_blank" style="color: #4CAF50;">${interviewLink}</a>
  //             </div>
  //             <p style="font-size: 16px; line-height: 1.5;">
  //               Please ensure that you are ready and prepared at the scheduled time. Good luck with your interview!
  //             </p>
  //             <p style="font-size: 16px; line-height: 1.5;">
  //               Best Regards,<br>
  //               <strong>IamreadyAI Team</strong>
  //             </p>
  //           </div>
  //         </body>
  //       </html>
  //       `,
  //   };

  //   return await sendEmail(options);
  // }

  async sendInterviewEmail(
    email,
    interview_id,
    user_id,
    job_title,
    company_name
  ) {
    const interviewLink = `${MY_APP_FRONTEND_URL}/job-interview-instructions/?userId=${user_id}&interviewId=${interview_id}`;
    const options = {
      to: email,
      subject: `Your Job Interview Schedule for ${job_title} at ${company_name}`,
      html: `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; color: #333; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #4CAF50; text-align: center;">Your Job Interview Details</h2>
            <p style="font-size: 16px; line-height: 1.5;">
              Dear Candidate,
            </p>
            <p style="font-size: 16px; line-height: 1.5;">
              Congratulations! Your job interview for the position of <strong>${job_title}</strong> at <strong>${company_name}</strong> has been scheduled. We are excited to help you achieve your career goals. Please use the link below to join the interview at the scheduled time:
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${interviewLink}" target="_blank" style="background-color: #4CAF50; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                Join Your Interview
              </a>
            </div>
            <div style="background-color: #f9f9f9; padding: 10px; margin-top: 20px; border-left: 4px solid #4CAF50; font-size: 16px;">
              <strong>Interview Link:</strong><br>
              <a href="${interviewLink}" target="_blank" style="color: #4CAF50;">${interviewLink}</a>
            </div>
            <p style="font-size: 16px; line-height: 1.5;">
              Please ensure that you are ready and prepared at the scheduled time. Good luck with your interview!
            </p>
            <p style="font-size: 16px; line-height: 1.5;">
              Best Regards,<br>
              <strong>IamreadyAI Team</strong>
            </p>
          </div>
        </body>
      </html>
      `,
    };

    return await sendEmail(options);
  }

  async scheduleJobInterview(job_id, application_id_list) {
    const no_of_applicants = application_id_list.length;

    console.log(no_of_applicants);

    const job = await this.repository.getJobByJobId(job_id);
    if (!job) throw new NotFoundError("Job not found");
    console.log(job);

    const user_id = job.user_id;
    const job_title = job.job_title;
    const company_name = job.company_name;

    const recruiter_data = await RPCService.request(PAYMENT_RPC, {
      type: RPC_TYPES.GET_RECRUITER_INTERVIEW_AVAILABLE,
      data: {
        user_id: user_id,
      },
    });

    console.log(recruiter_data);

    if (!recruiter_data) {
      throw new BadRequestError("Recruiter not found");
    }

    if (recruiter_data.interviews_available < no_of_applicants) {
      throw new BadRequestError("Not enough interviews available");
    } else {
      const result = await RPCService.request(PAYMENT_RPC, {
        type: RPC_TYPES.DECREMENT_RECRUITER_INTERVIEW_AVAILABLE,
        data: {
          user_id: user_id,
          number_of_interviews: no_of_applicants,
        },
      });

      console.log("result after reduction is =" + result);

      for (const application_id of application_id_list) {
        const result = await this.repository.scheduleJobInterview(
          job_id,
          application_id
        );

        console.log(result);

        const email = result.applicant_email;

        const user_id = result.applicant_user_id;

        console.log("Email is ==" + email);

        const interview_id = result.interview_id;

        await this.sendInterviewEmail(
          email,
          interview_id,
          user_id,
          job_title,
          company_name
        );
      }
    }

    return {
      message: "Interview scheduled successfully",
    };
  }

  async getJobInterview(interview_id) {
    const result = await this.repository.getJobInterviewByInterviewId(
      interview_id
    );

    return {
      message: "Job Interview fetched successfully",
      data: result,
    };
  }

  async scantalentpool(recruiter_id, job_id) {
    const job = await this.repository.getJobByJobId(job_id);

    console.log("fetching Job details");

    console.log(job);
    if (!job) throw new NotFoundError("Job not found");

    const job_description = job.job_description;

    const AllInternalStudentUsers = await RPCService.request(USERS_RPC, {
      type: RPC_TYPES.TALENTPOOL_GET_ALL_STUDENT_USERS,
      data: {
        recruiter_id: recruiter_id,
      },
    });

    console.log("fetching Internal Students Details");

    console.log(AllInternalStudentUsers);

    const AllTalentPoolUsers = await RPCService.request(TALENTPOOL_RPC, {
      type: RPC_TYPES.TALENTPOOL_GET_ALL_TALENTPOOL_USERS,
      data: {
        recruiter_id: recruiter_id,
      },
    });

    console.log("fetching TalentPool Students Details");

    console.log(AllTalentPoolUsers);

    const alreadyscanned = await this.repository.getalreadyscanned(
      recruiter_id,
      job_id
    );
    console.log("fetching alreadyscanned");

    console.log(alreadyscanned);

    for (const student of AllInternalStudentUsers) {
      console.log("in first loop");
      console.log(student);

      if (alreadyscanned.find((item) => item.resume_id === student.resume_id)) {
        console.log("already scanned");
        continue;
      }

      // const fileName=student.resume_id+".pdf";
      const fileName = `${student.resume_id}.pdf`;

      console.log(fileName);

      const signedUrl = await getInternalSignedUrlForRead(fileName);

      console.log(signedUrl);

      EventService.publish(RESUME_QUEUE, {
        type: "GENERATE_RESUME_SCORE",
        data: {
          id: `${job_id}-${student.resume_id}-TPScanInternal`,
          job_description: job_description,
          resume: signedUrl,
        },
      });

      const talentpool_type = "internal";

      const response = await this.repository.addstudentscandetails(
        job_id,
        recruiter_id,
        student.resume_id,
        student.candidate_name,
        student.candidate_email,
        student.contact_number,
        student.city,
        student.country,
        talentpool_type
      );
    }

    for (const student of AllTalentPoolUsers) {
      console.log("in second loop");
      console.log(student);

      if (alreadyscanned.find((item) => item.resume_id === student.resume_id)) {
        console.log("already scanned");
        continue;
      }

      // const fileName=student.resume_id+".pdf";
      const fileName = `${student.resume_id}.pdf`;

      console.log(fileName);

      const signedUrl = await getTalentPoolSignedUrlForRead(fileName);

      console.log(signedUrl);

      EventService.publish(RESUME_QUEUE, {
        type: "GENERATE_RESUME_SCORE",
        data: {
          id: `${job_id}-${student.resume_id}-TPScanPool`,
          job_description: job_description,
          resume: signedUrl,
        },
      });

      const talentpool_type = "external";

      const response = await this.repository.addstudentscandetails(
        job_id,
        recruiter_id,
        student.resume_id,
        student.candidate_name,
        student.candidate_email,
        student.contact_number,
        student.city,
        student.country,
        talentpool_type
      );
    }
    return {
      message: "Scanning Talent Pool",
    };
  }

  // async scantalentpool(recruiter_id,job_id){

  //   const job = await this.repository.getJobByJobId(job_id);

  //   console.log("fetching Job details");

  //     console.log(job);
  //     if (!job) throw new NotFoundError("Job not found");

  //     const job_description=job.job_description;

  //   const AllInternalStudentUsers=await RPCService.request(USERS_RPC, {
  //     type: RPC_TYPES.TALENTPOOL_GET_ALL_STUDENT_USERS,
  //     data: {
  //       recruiter_id:recruiter_id
  //     },
  //   });

  //   console.log("fetching Internal Students Details");

  //   console.log(AllInternalStudentUsers);

  //   const AllTalentPoolUsers=await RPCService.request(TALENTPOOL_RPC, {
  //     type: RPC_TYPES.TALENTPOOL_GET_ALL_TALENTPOOL_USERS,
  //     data: {
  //       recruiter_id:recruiter_id
  //     },
  //   });

  //   console.log("fetching TalentPool Students Details");

  //   console.log(AllTalentPoolUsers);

  //   const alreadyscanned=await this.repository.getalreadyscanned(recruiter_id,job_id);
  //   console.log("fetching alreadyscanned");

  //   console.log(alreadyscanned);

  //   for (const student of AllInternalStudentUsers) {

  //     console.log("in first loop");
  //     console.log(student);

  //     if(alreadyscanned.find((item)=>item.resume_id===student.resume_id)){
  //       console.log("already scanned");
  //       continue;
  //     }

  //     // const fileName=student.resume_id+".pdf";
  //     const fileName = `${student.resume_id}.pdf`;

  //     console.log(fileName);

  //     const signedUrl=await getInternalSignedUrlForRead(fileName);

  //     console.log(signedUrl);

  //     const resumeevaluation = await RPCService.request(RESUME_RPC, {
  //       type: RPC_TYPES.GET_RESUME_SCORE,
  //       data: {
  //         resume:signedUrl,
  //         job_description:job_description
  //       },
  //     });

  //     console.log(resumeevaluation);

  //     let ai_screening_recommendation=false;

  //     if(resumeevaluation.score>=75){
  //         ai_screening_recommendation=true;
  //     }

  //     const resume_score=resumeevaluation.score;

  //     console.log(resume_score);

  //     const talentpool_type="internal";

  //     const response=await this.repository.addstudentscandetails(job_id,recruiter_id,student.resume_id,student.candidate_name,student.candidate_email,student.contact_number,student.city,student.country,ai_screening_recommendation,resume_score,talentpool_type);

  //     console.log(response);

  //   }

  //   for(const student of AllTalentPoolUsers){

  //     console.log("in second loop");
  //     console.log(student);

  //     if(alreadyscanned.find((item)=>item.resume_id===student.resume_id)){
  //       console.log("already scanned");
  //       continue;
  //     }

  //     // const fileName=student.resume_id+".pdf";
  //     const fileName = `${student.resume_id}.pdf`;

  //     console.log(fileName);

  //     const signedUrl=await getTalentPoolSignedUrlForRead(fileName);

  //     console.log(signedUrl);

  //     const resumeevaluation = await RPCService.request(RESUME_RPC, {
  //       type: RPC_TYPES.GET_RESUME_SCORE,
  //       data: {
  //         resume:signedUrl,
  //         job_description:job_description
  //       },
  //     });

  //     console.log(resumeevaluation);

  //     let ai_screening_recommendation=false;

  //     if(resumeevaluation.score>=75){
  //         ai_screening_recommendation=true;
  //     }

  //     const resume_score=resumeevaluation.score;

  //     console.log(resume_score);

  //     const talentpool_type="external";

  //     const response=await this.repository.addstudentscandetails(job_id,recruiter_id,student.resume_id,student.candidate_name,student.candidate_email,student.contact_number,student.city,student.country,ai_screening_recommendation,resume_score,talentpool_type);

  //     console.log(response);

  //   }

  //   return{
  //     message:"Scanned Successfully"
  //   }

  // }

  // async scantalentpool(recruiter_id, job_id) {
  //   const job = await this.repository.getJobByJobId(job_id);
  //   if (!job) throw new NotFoundError("Job not found");

  //   const job_description = job.job_description;

  //   const [AllInternalStudentUsers, AllTalentPoolUsers, alreadyScannedList] = await Promise.all([
  //     RPCService.request(USERS_RPC, { type: RPC_TYPES.TALENTPOOL_GET_ALL_STUDENT_USERS, data: { recruiter_id } }),
  //     RPCService.request(TALENTPOOL_RPC, { type: RPC_TYPES.TALENTPOOL_GET_ALL_TALENTPOOL_USERS, data: { recruiter_id } }),
  //     this.repository.getalreadyscanned(recruiter_id, job_id),
  //   ]);

  //   const alreadyScanned = new Set(alreadyScannedList.map(item => item.resume_id));

  //   // Combine Internal + TalentPool Users
  //   const allStudents = [...AllInternalStudentUsers.map(student => ({ ...student, talentpool_type: "internal" })),
  //                       ...AllTalentPoolUsers.map(student => ({ ...student, talentpool_type: "external" }))];

  //   // Filter out already scanned students
  //   const newStudents = allStudents.filter(student => !alreadyScanned.has(student.resume_id));

  //   if (newStudents.length === 0) {
  //     return { message: "No new students to scan" };
  //   }

  //   // Fetch signed URLs in parallel
  //   const signedUrls = await Promise.all(newStudents.map(student =>
  //     student.talentpool_type === "internal"   ? getInternalSignedUrlForRead(`${student.resume_id}.pdf`)
  //       : getTalentPoolSignedUrlForRead(`${student.resume_id}.pdf`)
  //   ));

  //   // Fetch Resume Evaluations in parallel
  //   const resumeEvaluations = await Promise.all(newStudents.map((student, index) =>
  //     RPCService.request(RESUME_RPC, {
  //       type: RPC_TYPES.GET_RESUME_SCORE,
  //       data: { resume: signedUrls[index], job_description }
  //     })
  //   ));

  //   // Prepare data for batch insert
  //   const batchInsertData = newStudents.map((student, index) => {
  //     const ai_screening_recommendation = resumeEvaluations[index].score >= 75;
  //     return [
  //       job_id, recruiter_id, student.resume_id, student.candidate_name, student.candidate_email,
  //       student.contact_number, student.city, student.country, ai_screening_recommendation,
  //       resumeEvaluations[index].score, student.talentpool_type
  //     ];
  //   });

  //   // Batch insert data into DB
  //   await this.repository.addstudentscandetailsBatch(batchInsertData);

  //   return { message: "Scanned Successfully" };
  // }

  // async scantalentpool(recruiter_id, job_id) {
  //   const job = await this.repository.getJobByJobId(job_id);
  //   if (!job) throw new NotFoundError("Job not found");

  //   const job_description = job.job_description;

  //   const [AllInternalStudentUsers, AllTalentPoolUsers, alreadyScannedList] = await Promise.all([
  //     RPCService.request(USERS_RPC, { type: RPC_TYPES.TALENTPOOL_GET_ALL_STUDENT_USERS, data: { recruiter_id } }),
  //     RPCService.request(TALENTPOOL_RPC, { type: RPC_TYPES.TALENTPOOL_GET_ALL_TALENTPOOL_USERS, data: { recruiter_id } }),
  //     this.repository.getalreadyscanned(recruiter_id, job_id),
  //   ]);

  //   const alreadyScanned = new Set(alreadyScannedList.map(item => item.resume_id));

  //   // Combine Internal + TalentPool Users
  //   const allStudents = [...AllInternalStudentUsers.map(student => ({ ...student, talentpool_type: "internal" })),
  //                       ...AllTalentPoolUsers.map(student => ({ ...student, talentpool_type: "external" }))];

  //   // Filter out already scanned students
  //   const newStudents = allStudents.filter(student => !alreadyScanned.has(student.resume_id));

  //   if (newStudents.length === 0) {
  //     return { message: "No new students to scan" };
  //   }

  //   // Fetch signed URLs in parallel
  //   const signedUrls = await Promise.all(newStudents.map(student =>
  //     student.talentpool_type === "internal"
  //       ? getInternalSignedUrlForRead(`${student.resume_id}.pdf`)
  //       : getTalentPoolSignedUrlForRead(`${student.resume_id}.pdf`)
  //   ));

  //   // Fetch Resume Evaluations in parallel
  //   const resumeEvaluations = await Promise.all(newStudents.map(async (student, index) => {
  //     try {
  //       return await RPCService.request(RESUME_RPC, {
  //         type: RPC_TYPES.GET_RESUME_SCORE,
  //         data: { resume: signedUrls[index], job_description }
  //       });
  //     } catch (error) {
  //       console.error(`Error fetching resume score for ${student.resume_id}: ${error.message}`);
  //       return null; // Return null for failed evaluations
  //     }
  //   }));

  //   // Filter out students whose resume evaluation failed
  //   const successfulEvaluations = newStudents
  //     .map((student, index) => ({
  //       student,
  //       evaluation: resumeEvaluations[index]
  //     }))
  //     .filter(({ evaluation }) => evaluation !== null);

  //   // Prepare data for batch insert
  //   const batchInsertData = successfulEvaluations.map(({ student, evaluation }) => {
  //     const ai_screening_recommendation = evaluation.score >= 75;
  //     return [
  //       job_id, recruiter_id, student.resume_id, student.candidate_name, student.candidate_email,
  //       student.contact_number, student.city, student.country, ai_screening_recommendation,
  //       evaluation.score, student.talentpool_type
  //     ];
  //   });

  //   // Only insert if there is valid data
  //   if (batchInsertData.length > 0) {
  //     await this.repository.addstudentscandetailsBatch(batchInsertData);
  //   }

  //   return { message: "Scanned Successfully" };
  // }

  async gettalentpool(recruiter_id, job_id) {
    const data = await this.repository.getalreadyscanned(recruiter_id, job_id);

    return {
      message: "Talent Pool fetched successfully",
      data: data,
    };
  }

  async scheduleTalentPoolInterview(job_id, resume_id_list) {
    const no_of_applicants = resume_id_list.length;

    console.log(no_of_applicants);

    const job = await this.repository.getJobByJobId(job_id);
    if (!job) throw new NotFoundError("Job not found");
    console.log(job);

    const user_id = job.user_id;
    const job_title = job.job_title;
    const company_name = job.company_name;

    const recruiter_data = await RPCService.request(PAYMENT_RPC, {
      type: RPC_TYPES.GET_RECRUITER_INTERVIEW_AVAILABLE,
      data: {
        user_id: user_id,
      },
    });

    console.log(recruiter_data);

    if (!recruiter_data) {
      throw new BadRequestError("Recruiter not found");
    }

    if (recruiter_data.interviews_available < no_of_applicants) {
      throw new BadRequestError("Not enough interviews available");
    } else {
      const result = await RPCService.request(PAYMENT_RPC, {
        type: RPC_TYPES.DECREMENT_RECRUITER_INTERVIEW_AVAILABLE,
        data: {
          user_id: user_id,
          number_of_interviews: no_of_applicants,
        },
      });

      console.log("result after reduction is =" + result);

      for (const resume_id of resume_id_list) {
        const result = await this.repository.scheduleTalentPoolInterview(
          job_id,
          resume_id
        );

        console.log(result);

        const email = result.candidate_email;

        const user_id = result.resume_id;

        console.log("Email is ==" + email);

        const interview_id = result.interview_id;

        await this.sendInterviewEmail(
          email,
          interview_id,
          user_id,
          job_title,
          company_name
        );
      }
    }

    return {
      message: "Interview scheduled successfully",
    };
  }

  async moveRecommendedToApplication(job_id, resume_id_list) {
    const jobdata = await this.repository.getJobByJobId(job_id);

    if (!jobdata) {
      throw new NotFoundError("Job not found");
    }

    console.log(jobdata);

    for (const resume_id of resume_id_list) {
      console.log(resume_id);

      try {
        const data =
          await this.repository.getTalentPoolRecommendationByResumeIdandJobId(
            resume_id,
            job_id
          );
        console.log(data);

        const applicationData = {
          job_id: job_id,
          resume_id: data.resume_id,
          candidate_name: data.candidate_name || "NA",
          candidate_email: data.candidate_email || "NA",
          ai_screening_recommendation: data.ai_screening_recommendation,
          resume_score: data.resume_score,
          ai_interview_score: data.ai_interview_score,
          interview_id: data.interview_id,
          interview_status: data.interview_status,
        };

        const result = await this.repository.moveRecommendedToApplication(
          applicationData
        );

        const response =
          await this.repository.deleteTalentPoolRecommendationByResumeIdandJobId(
            resume_id,
            job_id
          );
      } catch (err) {
        console.log(err);
      }
    }

    return {
      message: "Moved Successfully",
    };
  }

  async eventTesting(interview_id) {
    EventService.publish(SERVICE_QUEUE, {
      type: "INTERVIEW_DETAILS",
      data: {
        interview_id: interview_id,
        transcript: {
          question: "question",
        },
        feedback: {
          final_score: 50,
        },
      },
    });

    return {
      message: "Event sent successfully",
    };
  }

  async manualApplicationFix1() {
    console.log("in service");

    const data = await this.repository.manualApplicationFix1();

    console.log(data);

    // for(application of data){

    //   console.log("in loop");

    //   let ai_screening_recommendation=false;

    //   if(application.resume_score>=75){

    //     ai_screening_recommendation=true;
    //   }else{
    //     ai_screening_recommendation=false;
    //   }

    //   const updateData={
    //     ai_screening_recommendation
    //   }

    //   await this.repository.updateApplication(application.application_id,updateData);

    //   console.log("Application updated");

    // }

    const updatePromises = data.map(async (application) => {
      console.log("in loop");

      let ai_screening_recommendation = application.resume_score >= 75;

      const updateData = { ai_screening_recommendation };

      await this.repository.updateApplication(
        application.application_id,
        updateData
      );

      console.log("Application updated");
    });

    await Promise.all(updatePromises);

    return {
      message: "Application fix 1 successfully",
    };
  }

  // async manualApplicationFix2(){

  //   console.log("in service")

  //   const data=await this.repository.manualApplicationFix2();

  //   for(application in data){

  //     console.log("in loop");

  //     const job_id=application.job_id;
  //     const user_id=application.applicant_user_id;

  //     const job = await this.repository.getJobById(user_id,job_id);

  //     console.log(job);
  //     if (!job) {
  //       continue;
  //     }

  //     // console.log(job.validity_status);

  //     if (job.validity_status != 'open') {
  //       // throw new BadRequestError("Job is not open for applications");
  //       continue;
  //     }

  //     const userDetails = await RPCService.request(USERS_RPC, {
  //       type: RPC_TYPES.GET_APPLICANT_DETAILS,
  //       data: {
  //         userId: user_id,
  //       },
  //     });

  //     console.log(userDetails);
  //     if (!userDetails) {
  //       continue;
  //     }

  //     const job_description=job.job_description;

  //     EventService.publish(RESUME_QUEUE, {
  //       type: "GENERATE_RESUME_SCORE",
  //       data: {
  //         id: application.application_id,
  //         job_description:job_description,
  //         resume: userDetails.signedUrl,
  //       },
  //     })

  //     console.log("Event sent successfully");

  //   }

  //   return{
  //     message:"Application fix 2 successfully"
  //   }
  // }

  async manualApplicationFix2() {
    console.log("in service");

    const data = await this.repository.manualApplicationFix2();

    // Run tasks in parallel using map()
    const tasks = data.map(async (application) => {
      console.log("in loop");

      const job_id = application.job_id;
      const user_id = application.applicant_user_id;

      try {
        const job = await this.repository.getJobById(user_id, job_id);
        if (!job) {
          console.log(`Skipping: Job not found for job_id ${job_id}`);
          return;
        }

        if (job.validity_status !== "open") {
          console.log(`Skipping: Job ${job_id} is not open for applications`);
          return;
        }

        const userDetails = await RPCService.request(USERS_RPC, {
          type: RPC_TYPES.GET_APPLICANT_DETAILS,
          data: { userId: user_id },
        });

        if (!userDetails) {
          console.log(
            `Skipping: User details not found for user_id ${user_id}`
          );
          return;
        }

        const job_description = job.job_description;

        await EventService.publish(RESUME_QUEUE, {
          type: "GENERATE_RESUME_SCORE",
          data: {
            id: application.application_id,
            job_description: job_description,
            resume: userDetails.signedUrl,
          },
        });

        console.log(
          `Event sent successfully for application_id ${application.application_id}`
        );
      } catch (error) {
        console.error(
          `Error processing application_id ${application.application_id}:`,
          error
        );
      }
    });

    await Promise.all(tasks); // Execute all async operations concurrently

    return { message: "Application fix 2 successfully" };
  }
}

// EventService.subscribe(SERVICE_QUEUE, Service);
// RPCService.respond(Service);

module.exports = Service;
