const Token = require("../utils/token");
const { UnauthorizedError } = require("../utils/errors");

// Middleware to check if the user is authenticated
module.exports = async (req, res, next) => {
  const token = new Token();

  const authToken = req.headers["authorization"]?.split(" ")[1];

  if (!authToken)
    throw new UnauthorizedError("Authentication token is required");

  try {
    const decodedToken = token.verifyToken(authToken);

    if (!decodedToken) {
      throw new Error("Invalid Authentication token");
    }
    req.userId = decodedToken.sub;

    if (!req.userId) {
      throw new UnauthorizedError("Invalid user");
    }

    if (decodedToken.role !== "recruiter") {
      throw new Error("Invalid role");
    }

    next();
  } catch (error) {
    throw new UnauthorizedError(error.message);
  }
};
