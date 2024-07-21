import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const existedLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });
  if (existedLike) {
    await Like.findByIdAndDelete(existedLike._id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Video disliked successfully"));
  } else {
    const like = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    if (!like) {
      throw new ApiError(400, "failed to like video");
    }

    return res
      .status(200)
      .json(new ApiResponse(201, like, "Video liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const existedComment = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });
  if (existedComment) {
    await Like.findByIdAndDelete(existedComment._id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment disliked successfully"));
  } else {
    const comment = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    if (!comment) {
      throw new ApiError(400, "failed to like comment");
    }

    return res
      .status(200)
      .json(new ApiResponse(201, comment, "Comment liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const existedTweet = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });
  if (existedTweet) {
    await Like.findByIdAndDelete(existedTweet._id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Tweet disliked successfully"));
  } else {
    const tweet = await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });
    if (!tweet) {
      throw new ApiError(400, "failed to like tweet");
    }

    return res
      .status(200)
      .json(new ApiResponse(201, tweet, "Tweet liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const currentUser = req.user._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(currentUser),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideosDetails",
      },
    },
    {
      $unwind: "$likedVideosDetails",
    },
    {
      $lookup: {
        from: "users",
        localField: "likedVideosDetails.owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        _id: "$likedVideosDetails._id",
        title: "$likedVideosDetails.title",
        createdAt: "$likedVideosDetails.createdAt",
        owner: {
          id: "$ownerDetails._id",
          fullName: "$ownerDetails.fullName",
        },
        thumbnail: "$likedVideosDetails.thumbnail",
        views: "$likedVideosDetails.views",
        duration: "$likedVideosDetails.duration",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos"));
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
