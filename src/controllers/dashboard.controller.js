import mongoose, { isValidObjectId, mongo } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.models.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const channelTotalVideosViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
    {
      $project: {
        totalVideos: 1,
        totalViews: 1,
      },
    },
  ]);

  const videosLike = (
    await Like.find({ likedBy: channelId, video: { $exists: true } })
  ).length;

  const videosComments = (await Comment.find({ owner: channelId })).length;

  const channelSubscribers = (await Subscription.find({ channel: channelId }))
    .length;

  const channelSubscribing = (
    await Subscription.find({ subscriber: channelId })
  ).length;

  const result = {
    videosLike,
    videosComments,
    channelTotalVideosViews: channelTotalVideosViews[0],
    channelSubscribers,
    channelSubscribing,
  };

  res
    .status(200)
    .json(new ApiResponse(200, result, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const channelVideos = await Video.find({ owner: channelId });
  if (!channelVideos) {
    throw new ApiError(404, "Error in finding videos");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, channelVideos, "Channel videos fetched successfully")
    );
});

export { getChannelStats, getChannelVideos };
