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
} = require("../config");

// Service will contain all the business logic
class Service {
  constructor() {
    this.repository = new Repository();
  }

  // Login method will be used to authenticate the user
  // async login(email, password) {
  //   const user = await this.repository.getUser(email);

  //   if (!user) throw new NotFoundError("User not found");

  //   if (!(await bcrypt.compare(password, user.password)))
  //     throw new BadRequestError("Invalid password");

  //   EventService.publish(TEST_QUEUE, {
  //     type: EVENT_TYPES.USER_LOGGED_IN,
  //     data: {
  //       userId: user.public_id,
  //       email: user.email,
  //     },
  //   });

  //   return {
  //     message: "Login successful",
  //     user: {
  //       id: user.public_id,
  //       email: user.email,
  //       name: user.name,
  //       created_at: user.created_at,
  //     },
  //   };
  // }

  // Register method will be used to create a new user
  // async register(email, password, name) {
  //   const user = await this.repository.getUser(email);
  //   if (user) throw new BadRequestError("User already exists");

  //   const hashedPassword = await bcrypt.hash(password, 10);
  //   const newUser = await this.repository.createUser(
  //     email,
  //     hashedPassword,
  //     name
  //   );

  //   EventService.publish(TEST_QUEUE, {
  //     type: EVENT_TYPES.USER_CREATED,
  //     data: {
  //       userId: newUser.public_id,
  //       email: newUser.email,
  //     },
  //   });

  //   return {
  //     message: "User created successfully",
  //     user: {
  //       id: newUser.public_id,
  //       email: newUser.email,
  //       name: newUser.name,
  //       created_at: newUser.created_at,
  //     },
  //   };
  // }



  async createJob(jobData) {

    const job = await this.repository.createJob(jobData);
    return {
      message: "Job created successfully",
      job,
    };
  }

  async deleteJob(jobId) {
    const job = await this.repository.getJobById(jobId);
    if (!job) throw new NotFoundError("Job not found");

    await this.repository.deleteJob(jobId);
  }

  async updateJob(jobId, updateData) {
    const job = await this.repository.getJobById(jobId);
    if (!job) throw new NotFoundError("Job not found");

    const updatedJob = await this.repository.updateJob(jobId, updateData);
    return {
      message: "Job updated successfully",
      updatedJob,
    };
  }

  async getAllMyJobsPostings(userId) {
    const jobs = await this.repository.getAllJobsPostedByUserId(userId);
    return jobs;
  }

}

// EventService.subscribe(SERVICE_QUEUE, Service);
// RPCService.respond(Service);

module.exports = Service;
