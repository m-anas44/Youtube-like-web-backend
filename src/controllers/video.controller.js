import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";

function formatDuration(seconds) {
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortType, sortBy, userID } = req.query;

  let match = {};
  if (query) {
    match.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userID) {
    match.owner = new mongoose.Types.ObjectId(userID);
  }

  const sort = {};
  if (sortType && sortBy) {
    sort[sortBy] = sortType === "desc" ? -1 : 1;
  } else {
    sort.createdAt = -1;
  }

  const pipeline = [
    { $match: match },
    { $sort: sort },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    {
      $project: {
        title: 1,
        description: 1,
        videoFile: 1,
        thumbnail: 1,
        views: 1,
        duration: 1,
        owner: {
          id: "$owner._id",
          username: "$owner.username",
          fullName: "$owner.fullName",
          avatar: "$owner.avatar",
          subscribersCount: "$owner.subscribersCount",
        },
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  const options = {
    page: Number(page),
    limit: Number(limit),
  };

  const result = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: result.docs,
        page: result.page,
        limit: result.limit,
        totalDocs: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
      "Videos Fetched Successfully"
    )
  );
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  let videoLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoLocalPath = req.files.videoFile[0].path;
  }

  const thumbnailLocalPath = req.files?.thumbnail
    ? req.files.thumbnail[0].path
    : null;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = thumbnailLocalPath
    ? await uploadOnCloudinary(thumbnailLocalPath)
    : null;

  if (!videoFile) {
    throw new ApiError(400, "Failed to upload video");
  }

  const isPublished = videoFile ? true : false;
  const durationInSeconds = Math.round(videoFile.duration);
  const duration = formatDuration(durationInSeconds);

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail?.url || "",
    duration: duration,
    owner: req.user._id,
    isPublished,
  });

  const publishedVideo = await Video.findById(video._id);

  if (!publishedVideo) {
    throw new ApiError(500, "Failed to publish video");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video, "Uploaded Video Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoID } = req.params;

  if (!isValidObjectId(videoID)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Increment views count
  await Video.findByIdAndUpdate(videoID, { $inc: { views: 1 } });

  // Retrieve the video and populate the owner
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoID),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "ownerDetails._id",
        foreignField: "channel",
        as: "ownerSubscribers",
      },
    },
    {
      $addFields: {
        ownerSubscribersCount: {
          $size: "$ownerSubscribers",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(videoID),
                "$ownerSubscribers.subscriber",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        videoFile: 1,
        thumbnail: 1,
        views: 1,
        duration: 1,
        owner: {
          username: "$ownerDetails.username",
          fullName: "$ownerDetails.fullName",
          avatar: "$ownerDetails.avatar",
          subscribersCount: "$ownerSubscribersCount",
        },
        isSubscribed: 1,
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

// Add video to user's video history
const user = await User.findById(req.user._id);

// Check if video is already in the video history to prevent duplicates
const alreadyWatched = user.videoHistory.some((vid) => vid.toString() === videoID);

if (!alreadyWatched) {
  user.videoHistory.push(videoID);
  await user.save();
}

  res.status(200).json(new ApiResponse(200, video[0], "Video found"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoID } = req.params;
  const { title, description } = req.body;

  const thumbnailLocalPath = req.file ? req.file.path : null;

  const thumbnail = thumbnailLocalPath
    ? await uploadOnCloudinary(thumbnailLocalPath)
    : null;

  if (!title && !description && !thumbnail) {
    throw new ApiError(400, "At least one field is required");
  }

  let updateFields = {};
  if (title) updateFields.title = title;
  if (description) updateFields.description = description;
  if (thumbnail) updateFields.thumbnail = thumbnail.url;

  const video = await Video.findByIdAndUpdate(
    videoID,
    {
      $set: updateFields,
    },
    {
      new: true,
    }
  );

  if (!video) {
    throw new ApiError(404, "Video not updated");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video Updated Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoID } = req.params;
  if (!isValidObjectId(videoID)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findByIdAndDelete(videoID);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Video Deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoID } = req.params;
  if (!isValidObjectId(videoID)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoID);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video status toggled successfully"));
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
