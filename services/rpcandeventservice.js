const { Repository } = require("../database");
// A mock function to simulate user lookup
const {
  getSignedUrlForRead,
  getInternalSignedUrlForRead,
  getTalentPoolSignedUrlForRead
} = require("../config/awsconfig");

class JobsService {
  constructor() {
    this.repository = new Repository();
  }

  async respondRPC(request) {
    console.log("Received request", request);

    if (request.type === "GET_APPLICANT_DETAILS_FOR_JOB_INTERVIEW") {
      const { interview_id } = request.data;

      const application = await this.repository.getApplicationByInterviewId(
        interview_id
      );

      if(application){

        const job_id = application.job_id;

      const job = await this.repository.getJobByJobId(job_id);

      const user_id = application.applicant_user_id;

      const filename = `${user_id}.pdf`;

      let resume_url = "";

      if (application.application_type == "internal") {
        resume_url = await getInternalSignedUrlForRead(filename);
      } else {
        resume_url = await getSignedUrlForRead(filename);
      }

      return {
        application,
        job,
        resume_url,
      };

      }else{

        const talentpoolentry = await this.repository.getTalentPoolEntryByInterviewId(
          interview_id
        );

        const job_id = talentpoolentry.job_id;

      const job = await this.repository.getJobByJobId(job_id);

      const user_id = talentpoolentry.resume_id;

      const filename = `${user_id}.pdf`;

      let resume_url = "";

      if (talentpoolentry.talentpool_type == "internal") {
        resume_url = await getInternalSignedUrlForRead(filename);
      } else {
        resume_url = await getTalentPoolSignedUrlForRead(filename);
      }

      return {
        talentpoolentry,
        job,
        resume_url,
      };


      }

      
    }

    return { error: "Invalid request" };
  }

  async handleEvent(event) {
    console.log("Received event", event);
    if (event.type === "INTERVIEW_DETAILS") {
      const { interview_id, transcript, feedback } = event.data;

      await Promise.all([
        this.repository.addInterviewFeedback(
          interview_id,
          transcript,
          feedback
        ),
      ]);

      const result=await this.repository.getJobInterviewFeedbackByInterviewId(interview_id);

      const ai_interview_score = result.feedback.final_score;

      await this.repository.updateInterviewScoreByInterviewId(
        interview_id,
        ai_interview_score
      );


    } else if (event.type === "INTERVIEW_COMPLETED") {
      const { interviewId } = event.data;

      await this.repository.updateInterviewStatusByInterviewId(
        interviewId,
        "completed"
      );
      
      await this.repository.updateApplicationStatusByInterviewId(
        interviewId,
        "interviewCompleted"
      )
    } else if (event.type === "INTERVIEW_STARTED") {
      const { interviewId } = event.data;

      await this.repository.updateInterviewStatusByInterviewId(
        interviewId,
        "running"
      );
    }else if (event.type === "RESUME_SCORED") {
      const { id,score,expalination } = event.data;

      let ai_screening_recommendation=false;
      const applicationId=id;

      if(score>=75){
        ai_screening_recommendation=true;
      }

      const updateData={
        resume_score:score,
        ai_screening_recommendation
      }
  
      // const temp=this.repository.updateApplication(result.application_id,{resume_score:resumeevaluation.score});
      const temp=await this.repository.updateApplication(applicationId,updateData);
      


    }
  }
}
module.exports = { JobsService };
