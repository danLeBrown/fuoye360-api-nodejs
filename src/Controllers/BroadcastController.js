const cloudinary = require("cloudinary").v2,
  { getFile } = require("../../config/s3.config"),
  { successResponse, errorResponse } = require("../Helpers/response"),
  // { Broadcast, User, sequelize } = require("../../models"),
  Broadcast = require("../../mongodb/models/Broadcast"),
  User = require("../../mongodb/models/User"),
  // { Op, QueryTypes } = require("sequelize"),
  { relativeAt } = require("../Helpers/modifiers");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.store = async (req, res) => {
  const { broadcast_id, body, media } = req.body,
    { _id } = req.user;
  try {
    /**
     * Create broadcast
     */
    let broadcast = await Broadcast.create({
      user: _id,
      broadcast_id,
      body,
      media: media,
    });

    if (broadcast_id) {
      await Broadcast.findByIdAndUpdate(
        broadcast_id,
        {
          $push: { comments: { $each: [broadcast._id], $position: 0 } },
        },
        { new: true }
      );
    }
    /**
     * Update users broadcast
     */
    await User.findOneAndUpdate(
      { _id },
      {
        $push: { broadcasts: broadcast._id },
      }
    );

    /**
     * Add some meta data to broadcast
     */
    broadcast = await adulterateBroadcast(req, broadcast);

    successResponse(res, 200, "Broadcast created successfully", broadcast);
  } catch (error) {
    console.log(error);
    errorResponse(res, 422, error, null);
  }
};

exports.index = async (req, res) => {
  const user = req.user;
  try {
    const broadcasts = await Broadcast.find({ broadcast_id: null })
      .sort({ created_at: -1 })
      .populate(["user"])
      .lean();
    for (let broadcast of broadcasts) {
      broadcast = adulterateBroadcast(req, broadcast);
    }

    successResponse(res, 200, "Broadcasts retrieved successfully", broadcasts);
  } catch (error) {
    console.error(error);
    // errorResponse(res, 422, error, null);
  }
};

exports.destroy = async (req, res) => {
  const { broadcast_id } = req.body;
  const { _id } = req.user;
  try {
    /**
     * Create broadcast
     */
    let broadcast = await Broadcast.findOneAndDelete({
      _id: broadcast_id,
      user: _id,
    }).exec();

    if (broadcast) {
      /**
       * Update users broadcast
       */
      await User.findOneAndUpdate(
        { _id },
        {
          $pull: { broadcasts: broadcast_id },
        }
      );
      successResponse(res, 200, "Broadcast deleted successfully", broadcast);
    }
    errorResponse(res, 400, "Not ", broadcast);
  } catch (error) {
    console.log(error);
    errorResponse(res, 422, error, null);
  }
};

exports.showUser = async (req, res) => {
  const { user_id } = req.params;
  try {
    const broadcasts = await Broadcast.find({ user: user_id })
      .sort({ created_at: -1 })
      .populate(["user"])
      .lean();
    for (let broadcast of broadcasts) {
      broadcast = adulterateBroadcast(req, broadcast);
    }
    successResponse(res, 200, "Broadcasts retrieved successfully", broadcasts);
  } catch (error) {
    console.log(error);
  }
};

exports.getBookmarks = async (req, res) => {
  const { _id } = req.user;
  try {
    const user = await User.findOne({ _id })
      .populate({
        path: "broadcast_bookmarks",
        populate: {
          path: "user",
        },
      })
      .lean();
    const bookmarks = user.broadcast_bookmarks;
    for (let broadcast of bookmarks) {
      broadcast = adulterateBroadcast(req, broadcast);
    }
    successResponse(res, 200, "Broadcasts retrieved successfully", bookmarks);
  } catch (error) {
    console.log(error);
  }
};
// exports.uploadImage = async (req, res) => {
//   req.files.forEach(async (file) => {
//     const { buffer, originalname, mimetype } = file;
//     const timestamp = new Date().toISOString();
//     const ref = `${timestamp}-${originalname}.webp`;
//     const data = await sharp(buffer).webp({ quality: 20 }).toBuffer();
//     const stream = cloudinary.uploader.upload_stream(
//       { folder: "fuoye360/broadcast_images" },
//       (error, result) => {
//         if (error) {
// errorResponse(res, 500, error, null);
//         }
//         successResponse(res, 200, "Broadcast Image uploaded successfully", {
//           url: result.secure_url,
//         });
//       }
//     );
//     bufferToStream(data).pipe(stream);
/*
    const s3 = new aws.S3();
    // const fileName = req.query["file-name"];
    // const fileType = req.query["file-type"];
    const s3Params = {
      Bucket: S3_BUCKET,
      Key: ref,
      Expires: 60,
      ContentType: mimetype,
      ACL: "public-read",
    };

    s3.getSignedUrl("putObject", s3Params, (err, data) => {
      if (err) {
        // return errorResponse(res, 422, err, null);
      }
      const returnData = {
        signedRequest: data,
        url: `https://${S3_BUCKET}.s3.amazonaws.com/${ref}`,
      };
      return successResponse(
        res,
        200,
        "Broadcast Image uploaded successfully",
        returnData
      );
    });
    */
//   });
// };

const deleteTweet = (id) => {
  return Broadcast.destroy({ where: { id } });
};

const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  return readable;
};

const adulterateBroadcast = (req, broadcast) => {
  const user = req.user;
  let meta = {
    is_thread: false,
    _info: {
      count: 4,
      type: "likes",
      user: {
        _id: 4,
        full_name: "Dave",
      },
    },
    has_bookmarked: user.broadcast_bookmarks.includes(broadcast._id)
      ? true
      : false,
    has_retweeted: user.broadcast_retweets.includes(broadcast._id)
      ? true
      : false,
    has_liked: user.broadcast_likes.includes(broadcast._id) ? true : false,
    is_followig: user.following.includes(broadcast.user._id) ? true : false,
  };
  broadcast.relative_at = relativeAt(broadcast.created_at);
  broadcast.meta = meta;
  return broadcast;
};
