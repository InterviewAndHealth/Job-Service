const express = require("express");
const { Service } = require("../services");
const { BadRequestError } = require("../utils/errors");

const router = express.Router();
const service = new Service();
const authMiddleware = require("../middlewares/auth");
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
    requiredSkills 
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
    requiredSkills );

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


router.post("/recommendation/getapplicationsbyjobid",async(req,res)=>{
  const {job_id} = req.body;
  const data = await service.getApplicationsByJobId(job_id);
  return res.status(200).json(data);
})

router.put("/recommendation/updateapplicationsbyapplicationid",async(req,res)=>{
  const updates = req.body; // Array of updates
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Request body must be an array of updates." });
    }

    const data = await service.updateApplications(updates);
    return res.status(200).json(data);
})




module.exports = router;
