import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.models.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelID } = req.params;
  const subscriberId = req.user._id;
  if (!isValidObjectId(channelID)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const existingSubscription = await Subscription.findOne({
    channel: channelID,
    subscriber: subscriberId,
  });

  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Channel Unsubscribed Successfully"));
  } else {
    const newSubscription = await Subscription.create({
      channel: channelID,
      subscriber: subscriberId,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(201, newSubscription, "Channel Subscribed Successfully")
      );
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelID } = req.params;
  if (!isValidObjectId(channelID)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const userSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelID),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberInfo",
      },
    },
    {
      $unwind: "$subscriberInfo",
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: "$subscriberInfo._id",
          username: "$subscriberInfo.username",
          fullName: "$subscriberInfo.fullName",
          avatar: "$subscriberInfo.avatar",
        },
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(201, userSubscribers, "Fetched Subscriber List"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { userID } = req.params;
  if (!isValidObjectId(userID)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscribeChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(userID),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelInfo",
      },
    },
    {
      $unwind: "$channelInfo",
    },
    {
      $project: {
        _id: 0,
        channel: {
          _id: "$channelInfo._id",
          username: "$channelInfo.username",
          fullName: "$channelInfo.fullName",
          avatar: "$channelInfo.avatar",
        },
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(201, subscribeChannels, "Fetched Channel Subscribed List")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
