const express = require("express");
const { Service } = require("../services");
const { BadRequestError } = require("../utils/errors");

const router = express.Router();
const service = new Service();
const authMiddleware = require("../middlewares/auth");

router.get("/", (req, res) => {
  res.json({ message: "Welcome to the users API" });
});


router.post("/createjob",authMiddleware,async (req, res) => {
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

    const user_id=req.userId;

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


  router.delete(
    "/deletejob",
  authMiddleware,
    async (req, res) => {
      const { job_id } = req.body; // Get job_id from the body
      await service.deleteJob(job_id);
      return res.status(200).json({ message: "Job deleted successfully" });
    }
  );

  router.put(
    "/updatejob",
    authMiddleware,
    async (req, res) => {
      const { job_id, ...updateData } = req.body; // Get job_id and update data from the body
      const data = await service.updateJob(job_id, updateData);
      return res.status(200).json(data);
    }
  );

  router.get(
    "/getAllMyPostedJobs",
    authMiddleware,
    async (req, res) => {
      // const { user_id } = req.body; // Get user_id from the body
      const user_id=req.userId;
      const data = await service.getAllMyJobsPostings(user_id);
      return res.status(200).json(data);
    }

  );


module.exports = router;
