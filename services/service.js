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
  USERS_RPC
} = require("../config");
const { RPC_TYPES } = require("../config");

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

  async getFilteredJobs(jobTitle,             
    jobExperience,    
    jobLocations,
    jobType,
    workType,
    salaryMin, 
    requiredSkills ){
      const jobs=await this.repository.getFilteredJobs(jobTitle,
        jobExperience,
        jobLocations,
        jobType,
        workType,
        salaryMin,
        requiredSkills
        );
        if (!jobs) throw new NotFoundError("No jobs found");
        return {
          message: "Jobs fetched successfully",
          jobs,
        };

    }

  async getJobById(user_id,job_id) {
    const job = await this.repository.getJobById(user_id,job_id);
    if (!job) throw new NotFoundError("Job not found");
    return job;
  }

  async createJob(jobData) {
    const job = await this.repository.createJob(jobData);
    if (!job) throw new InternalServerError("Failed to create job");
    return {
      message: "Job created successfully",
      job,
    };
  }

  async deleteJob(jobId) {
    const job = await this.repository.getJobById(jobId);
    if (!job) throw new NotFoundError("Job not found");

    await this.repository.deleteJob(jobId);

    return {
      message: "Job deleted successfully",
    };
  }

  async updateJob(jobId, updateData) {
    const job = await this.repository.getJobById(jobId);
    if (!job) throw new NotFoundError("Job not found");

    const updatedJob = await this.repository.updateJob(jobId, updateData);
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

  //Applicants functions

  async Applicant_applyJob(job_id,user_id) {
    const job = await this.repository.getJobById(user_id,job_id);

    // console.log(job);
    if (!job) throw new NotFoundError("Job not found");

    // console.log(job.validity_status);

    if (job.validity_status != 'open') {
      throw new BadRequestError("Job is not open for applications");
    }

    const userDetails = await RPCService.request(USERS_RPC, {
      type: RPC_TYPES.GET_APPLICANT_DETAILS,
      data: {
        userId: userId,
      },
    });

    // console.log(userDetails);
    if (!userDetails) throw new NotFoundError("Applicant Details not found");

    const email = userDetails.user.email;
    const name =
      userDetails.profile.firstname + " " + userDetails.profile.lastname;
    const resume = userDetails.profile.resumelink;

    const result = await this.repository.Applicant_applyJob(
      jobId,
      userId,
      email,
      name,
      resume
    );

    // console.log(result);

    if (!result) throw new InternalServerError("Failed to apply job");

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
      }
  }


  async getApplicationsByJobId(job_id){
    const applications=await this.repository.getApplicationsByJobId(job_id);

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
    }
  }



  async updateApplications(updates){

    const results = await Promise.all(
      updates.map(async (update) => {
        const { application_id, ...updateData } = update;
  
        if (!application_id) {
          throw new Error("Missing application_id in update object.");
        }
  
        const application = await this.repository.getApplicationById(application_id);
        if (!application) throw new NotFoundError(`Application with ID ${application_id} not found`);
  
        const updatedApplication = await this.repository.updateApplication(application_id, updateData);
        return updatedApplication;
      })
    );
  
    return {
      message: "Applications updated successfully",
      results
    };

  }
}

// EventService.subscribe(SERVICE_QUEUE, Service);
// RPCService.respond(Service);

module.exports = Service;
