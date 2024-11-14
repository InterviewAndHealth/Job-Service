const { customAlphabet } = require("nanoid");
const DB = require("./db");

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

// Repository will be used to interact with the database
class Repository {
  // Get user by email
  // async getUser(email) {
  //   const result = await DB.query({
  //     text: "SELECT * FROM users WHERE email = $1",
  //     values: [email],
  //   });
  //   return result.rows[0];
  // }

  // // Create a new user
  // async createUser(email, password, name) {
  //   const id = nanoid();

  //   const result = await DB.query({
  //     text: "INSERT INTO users (public_id, email, password, name) VALUES ($1, $2, $3, $4) RETURNING *",
  //     values: [id, email, password, name],
  //   });

  //   return result.rows[0];
  // }


  
}

module.exports = Repository;
