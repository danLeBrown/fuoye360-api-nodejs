const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../../config/jwt.config");
const { successResponse, errorResponse } = require("../Helpers/response");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const User = require("../../mongodb/models/User");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  const { name, username, email, phone_number, password } = req.body;

  try {
    const user = await registerUser(
      name,
      username,
      email,
      phone_number,
      password
    );
    const token = await generateToken(user);
    successResponse(res, 200, "User regristration successful", {
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    errorResponse(res, 422, error.errors[0].message, null);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    const token = await generateToken(user);
    successResponse(res, 200, "User login successful", { user, token });
  } catch (error) {
    errorResponse(res, 422, error, null);
  }
};

exports.googleOauth = async (req, res) => {
  const { credential } = req.body;

  try {
    const verified_user = await verify(credential);
    // console.log(verified_user);
    const new_user = {
      full_name: verified_user.name,
      username: generateUsername(verified_user.name),
      email: verified_user.email,
      image: verified_user.picture,
      google_id: verified_user.sub,
    };

    let user = await User.findOne({ google_id: verified_user.sub });
    if (!user) {
      user = await User.create(new_user);
    }
    const token = await generateToken(user);
    console.log({ user, token });
    successResponse(res, 200, "User login successful", { user, token });
  } catch (error) {
    console.log(error);
    errorResponse(res, 500, "An error occured", null);
  }
};

const registerUser = async (
  full_name,
  username,
  email,
  phone_number,
  password
) => {
  const hash = bcrypt.hashSync(password, saltRounds);
  const data = {
    full_name,
    username,
    email,
    phone_number,
    password: hash,
  };

  return await User.create(data);
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw "Your credentials are incorrect!";
  }
  const checkPwd = await bcrypt.compare(password, user.password);
  if (checkPwd) {
    return user;
  }
  throw "Your credentials are incorrect!";
};

const generateToken = async (user) => {
  return await jwt.sign(
    {
      user,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};

const generateUsername = (fullname) => {
  const full_name = fullname.toLowerCase();
  const username = full_name.replace(/\s/g, "_");
  return username;
};

const verify = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
};
