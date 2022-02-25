const { uploadFile } = require("../../../config/s3.config");
const sharp = require("sharp");
const uuid = require("uuid");
exports.validateAndUploadImage = async (req, res, next) => {
  req.body.banner = req.user.banner;
  req.body.image = req.user.image;
  if (req.files["user-banner"]) {
    req.body.banner = await upload(req, req.files["user-banner"][0]);
  }
  if (req.files["user-image"]) {
    req.body.image = await upload(req, req.files["user-image"][0]);
  }
  next();
};

const upload = async (req, file) => {
  const { buffer, fieldname } = file;
  const timestamp = new Date().getTime();
  const renamedFile = `${timestamp}-${uuid.v4()}`;
  const data = await sharp(buffer).webp({ lossless: true }).toBuffer();
  const result = await uploadFile(data, fieldname, renamedFile);
  if (fieldname === "user-banner") {
    return (req.body.banner = `http://localhost:5000/api/v1/image/${result.key}`);
  } else if (fieldname === "user-image") {
    return (req.body.image = `http://localhost:5000/api/v1/image/${result.key}`);
  }
};
