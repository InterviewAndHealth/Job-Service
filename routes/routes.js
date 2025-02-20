const express = require("express");
const { Service } = require("../services");
const { BadRequestError } = require("../utils/errors");

const router = express.Router();
const service = new Service();
const authMiddleware = require("../middlewares/auth");
const { s3, upload, uploadFileToS3 } = require("../config/awsconfig");
const { RPC_TYPES } = require("../config");

router.get("/", (req, res) => {
  res.json({ message: "Welcome to the Jobs API" });
});

router.get("/getjobbyid", authMiddleware, async (req, res) => {
  const { job_id } = req.query; // Get job_id from the query params
  const user_id = req.userId;
  const data = await service.getJobById(user_id,job_id);
  return res.status(200).json(data);
});

router.get("/getallopenjobs", authMiddleware, async (req, res) => {
  const user_id = req.userId;
  const data = await service.getAllOpenJobs(user_id);

  return res.status(200).json(data);
});

router.post("/getfilteredjobs",authMiddleware,async(req,res)=>{
  const {
    jobTitle,             
    jobExperience,    
    jobLocations,
    jobType,
    workType,
    salaryMin, 
    requiredSkills,
    jobKeywords
    } =req.body;
    const userId = req.userId;
  const data = await service.getFilteredJobs(
    userId,
    jobTitle,             
    jobExperience,    
    jobLocations,
    jobType,
    workType,
    salaryMin, 
    requiredSkills,
    jobKeywords);

  return res.status(200).json(data);
});



router.post("/recruiter/createjob", authMiddleware, async (req, res) => {
  const {
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
  } = req.body;

  const user_id = req.userId;

  const data = await service.createJob({
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
  });

  return res.status(201).json(data);
});

router.delete("/recruiter/deletejob", authMiddleware, async (req, res) => {
  const { job_id } = req.body; // Get job_id from the body
  // const user_id = req.userId;
  const data = await service.deleteJob(job_id);
  return res.status(200).json(data);
});

router.put("/recruiter/updatejob", authMiddleware, async (req, res) => {
  const { job_id, ...updateData } = req.body; // Get job_id and update data from the body
  const data = await service.updateJob(job_id, updateData);
  return res.status(200).json(data);
});

router.get("/recruiter/getAllMyPostedJobs", authMiddleware, async (req, res) => {
  // const { user_id } = req.body; // Get user_id from the body
  const user_id = req.userId;
  const data = await service.getAllMyJobsPostings(user_id);
  return res.status(200).json(data);
});

router.post(
  "/recruiter/getAllApplicantsDetails",
  authMiddleware,
  async (req, res) => {
    const user_id = req.userId;
    const { job_id } = req.body;
    const data = await service.getAllApplicantsDetails(job_id);
    return res.status(200).json(data);
  }
);

// Applicant Routes

router.post("/applicant/applyjob", authMiddleware, async (req, res) => {
  const { job_id } = req.body;
  const user_id = req.userId; // Get job_id and user_id from the body
  // const jobId = job_id;
  const data = await service.Applicant_applyJob(job_id, user_id);
  return res.status(200).json(data);
});

router.get("/applicant/getmyapplications", authMiddleware, async (req, res) => {
  const user_id = req.userId;
  const data = await service.Applicant_getAllMyJobApplications(user_id);
  return res.status(200).json(data);
});



router.post("/recruiter/addexternalapplicant",upload.single("file"),async(req,res)=>{
  const{
    job_id,
    firstname,
    lastname,
    email,
    contactnumber
  }=req.body

  const filePath = req.file.path;
  const fileName = req.file.filename;


  const externalid = fileName.split('.').slice(0, -1).join('.');

  const resume_link = await uploadFileToS3(filePath, fileName);

  const result = await service.addExternalApplicant(job_id,firstname,lastname,email,contactnumber,resume_link,externalid);

  const data = await service.addExternalApplication(job_id,firstname,lastname,email,resume_link,externalid);

  return res.status(200).json(data);
})


router.post("/recruiter/schedulejobinterview",authMiddleware,async(req,res)=>{
  const{
    job_id,
    application_id_list
  }=req.body

  const data = await service.scheduleJobInterview(job_id,application_id_list);

  return res.status(200).json(data);
})

router.post("/getjobinterviewdetails",authMiddleware,async(req,res)=>{
  const{
    interview_id
  }=req.body

  const data = await service.getJobInterview(interview_id);

  return res.status(200).json(data);

})



router.post("/recruiter/scantalentpool",authMiddleware,async(req,res)=>{

  const recruiter_id=req.userId;

  const{job_id}=req.body;

  const data = await service.scantalentpool(recruiter_id,job_id);

  return res.status(200).json(data);
  
})

router.post("/recruiter/gettalentpool",authMiddleware,async(req,res)=>{

  const recruiter_id=req.userId;

  const{job_id}=req.body;

  const data =await service.gettalentpool(recruiter_id,job_id);

  return res.status(200).json(data);

})

router.post("/recruiter/scheduletalentpoolinterview",authMiddleware,async(req,res)=>{
  const{
    job_id,
    resume_id_list
  }=req.body

  const data = await service.scheduleTalentPoolInterview(job_id,resume_id_list);

  return res.status(200).json(data);
});

router.post("/recruiter/moverecommendedtoapplication",authMiddleware,async(req,res)=>{

  const{
    job_id,
    resume_id_list
  }=req.body

  const data = await service.moveRecommendedToApplication(job_id,resume_id_list);

  return res.status(200).json(data);

});








router.post("/eventtesting",async(req,res)=>{

  const{
    interview_id
  }=req.body

  const data =await service.eventTesting(interview_id);
})



router.get("/manualapplicationfix1",async(req,res)=>{

  console.log("in route");

  const data=await service.manualApplicationFix1();

  return res.status(200).json(data);
})


router.get("/manualapplicationfix2",async(req,res)=>{
  console.log("in route");

  const data=await service.manualApplicationFix2();

  return res.status(200).json(data);
})


module.exports = router;
