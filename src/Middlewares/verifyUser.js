const jwt = require("jsonwebtoken");
const { errorResponse } = require("../Helpers/response");
const { jwtSecret } = require("../../config/jwt.config");
const User = require("../../models/User");

exports.verifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    if (typeof token != undefined) {
      jwt.verify(token, jwtSecret, async (err, decoded) => {
        if (err) {
          errorResponse(res, 401, "User unauthenticated", null);
        } else {
          const email = decoded.user.email;
          const user = await User.findOne({ email });
          if (!user) {
            errorResponse(res, 401, "TF???", null);
          } else {
            req.user = user;
            next();
          }
        }
      });
    } else {
      errorResponse(res, 401, "User is unauthenticated", null);
    }
  } catch (error) {
    console.error(error);
    errorResponse(res, 401, "User is unauthenticated", null);
  }
};
