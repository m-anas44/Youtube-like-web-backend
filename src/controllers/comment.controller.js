import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Comment is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comment = await Comment.create({
    content,
    video: video._id,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(200, "Failed to create comment");
  }

  res
    .status(200)
    .json(new ApiResponse(201, comment, "Comment posted successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      content,
    },
    {
      new: true,
    }
  );
  if (!comment) {
    throw new ApiError(400, "Comment not updated");
  }
  res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const getVideoComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const commentsPipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "commentOwner",
      },
    },
    {
      $unwind: "$commentOwner",
    },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        owner: {
          _id: "$commentOwner._id",
          avatar: "$commentOwner.avatar",
          username: "$commentOwner.username",
        },
      },
    },
  ];

  const options = {
    page: Number(page),
    limit: Number(limit),
  };

  const result = await Comment.aggregatePaginate(
    Comment.aggregate(commentsPipeline),
    options
  );

  if (!result) {
    throw new ApiError(404, "Comments not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        comments: result.docs,
        page: result.page,
        limit: result.limit,
        totalDocs: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
      "Comment fetched for current video"
    )
  );
});

export { addComment, deleteComment, updateComment, getVideoComment };
