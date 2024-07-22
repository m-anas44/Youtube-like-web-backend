import { Tweet } from "../models/tweet.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { isValidObjectId } from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { tweetText } = req.body;
  if (!tweetText) {
    throw new ApiError(400, "Tweet text is required");
  }

  const tweet = await Tweet.create({
    content: tweetText,
    tweetBy: req.user._id,
  });
  if (!tweet) {
    throw new ApiError(401, "Failed to create tweet");
  }

  res
    .status(200)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  await Tweet.findByIdAndDelete(tweetId);
  res.status(200).json(new ApiResponse(200, null, "Tweet deleted sccussfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetText } = req.body;
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      content: tweetText,
    },
    { new: true }
  );
  if (!tweet) {
    throw new ApiError(400, "Failed to update tweet");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const getUserTweet = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const tweets = await Tweet.find({ tweetBy: userId }).populate(
    "tweetBy",
    "avatar username"
  );
  if (!tweets) {
    throw new ApiError(404, "User tweets not found");
  }

  res.status(200).json(new ApiResponse(200, tweets, "User Tweets Fetched"));
});

export { createTweet, deleteTweet, updateTweet, getUserTweet };
