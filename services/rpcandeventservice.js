const { Repository } = require("../database");
// A mock function to simulate user lookup
const { getSignedUrlForRead,getInternalSignedUrlForRead } = require("../config/awsconfig");

class JobsService {
  constructor() {
    this.repository = new Repository();
  }

  async respondRPC(request) {
    console.log("Received request", request);

    if(request.type === "GET_APPLICANT_DETAILS_FOR_JOB_INTERVIEW"){
      
      const {interview_id} = request.data;

      const application=await this.repository.getApplicationByInterviewId(interview_id);

      const job_id=application.job_id;

      const job=await this.repository.getJobByJobId(job_id);

      const user_id=application.applicant_user_id;

      const filename = `${user_id}.pdf`;


      let resume_url="";

      if(application.application_type=='internal'){
        resume_url=await getInternalSignedUrlForRead(filename);
      }else{
        resume_url=await getSignedUrlForRead(filename);
      }

      return{
        application,
        job,
        resume_url
      }

      
    }
  }

  async handleEvent(event) {
    console.log("Received event", event);
    if (event.type === "INTERVIEW_DETAILS") {
      const { interview_id, transcript, feedback } = event.data;

      await Promise.all([
        this.repository.addInterviewFeedback(interview_id, transcript, feedback),
      ]);
    }
  }
}
module.exports = { JobsService };
