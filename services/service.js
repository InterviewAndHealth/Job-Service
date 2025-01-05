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
} = require("../config");
const { RPC_TYPES } = require("../config");
const { getSignedUrlForRead } = require("../config/awsconfig");

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
    jobKeywords) {
      const jobs=await this.repository.getFilteredJobs(
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

  //Applicants functions

  async Applicant_applyJob(job_id,user_id) {
    const job = await this.repository.getJobById(user_id,job_id);

    // console.log(job);
    if (!job) throw new NotFoundError("Job not found");

    // console.log(job.validity_status);

    if (job.validity_status != 'open') {
      throw new BadRequestError("Job is not open for applications");
    }

    if(job.application_status=='Applied'){
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
      email,
      name,
      resume
    );

    // console.log(result);

    if (!result) throw new InternalServerError("Failed to apply job");

    const job_description=job.job_description;

    const resumeevaluation = await RPCService.request(RESUME_RPC, {
      type: RPC_TYPES.GET_RESUME_SCORE,
      data: {
        resume: userDetails.signedUrl,
        job_description:job_description
      },
    });

    const temp=this.repository.updateApplication(result.application_id,{resume_score:resumeevaluation.score});

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


async addExternalApplicant(job_id,firstname,lastname,email,contactnumber,resume_link,externalid){


  const result = await this.repository.addExternalApplicant(job_id,firstname,lastname,email,contactnumber,resume_link,externalid);


  return {
    message: "Applicant added successfully",
    result,
  };
}


async addExternalApplication(job_id,firstname,lastname,email,resume_link,externalid){


  const name = firstname + " " + lastname;

  const result = await this.repository.addExternalApplication(job_id,name,email,resume_link,externalid);


  const job = await this.repository.getJobByJobId(job_id);


  const job_description=job.job_description;

  const signedUrl=await getSignedUrlForRead(`${externalid}.pdf`);


    const resumeevaluation = await RPCService.request(RESUME_RPC, {
      type: RPC_TYPES.GET_RESUME_SCORE,
      data: {
        resume:signedUrl,
        job_description:job_description
      },
    });

    console.log(" score is "+resumeevaluation.score);

    const applicationId=result.application_id;

    const updateData={
      resume_score:resumeevaluation.score
    }

    const temp=await this.repository.updateApplication(applicationId,updateData);


  return {
    message: "Application added successfully",
    result,
  };

}





}

// EventService.subscribe(SERVICE_QUEUE, Service);
// RPCService.respond(Service);

module.exports = Service;
