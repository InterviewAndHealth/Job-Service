const { Repository } = require("../database");
// A mock function to simulate user lookup
// const { getSignedUrlForRead } = require("../config/awsconfig");
class JobsService {
  constructor() {
    this.repository = new Repository();
  }

  async respondRPC(request) {
    console.log("Received request", request);

    // if (request.type === "CHECK_USER_EXISTENCE") {
    //   // console.log(request);
    //   const { userid } = request.data;
    //   // Logic to check if user exists (e.g., query the database)
    //   // console.log(userid);
    //   const user = await this.repository.getUserbyid(userid);
    //   // console.log(user);
    //   const profile = await this.repository.getStudent(userid);
    //   // console.log(profile);

    //   const userExists = !!(user && profile);

    //   // Return the response
    //   return { data: userExists };

    // } else if (request.type === "GET_USER_RESUME") {
    //   const { userId } = request.data;
    //   // console.log(userId);

    //   const profile = await this.repository.getStudent(userId);

    //   if (!profile) {
    //     return { data: "Student Profile not found" };
    //   }

    //   const filename = `${userId}.pdf`;
    //   const signedUrl = await getSignedUrlForRead(filename);
    //   // console.log(signedUrl);
    //   return { data: signedUrl };
    // } else if (request.type === "GET_USER_DETAILS") {
    //   const { userId } = request.data;

    //   const profile = await this.repository.getStudent(userId);

    //   if (!profile) {
    //     return { datafound: 0, data: "Student Profile not found" };
    //   }

    //   return { datafound: 1, data: profile };
    // }
  }

  async handleEvent(event) {
    console.log("Received event", event);
  }
}
module.exports = { JobsService };
