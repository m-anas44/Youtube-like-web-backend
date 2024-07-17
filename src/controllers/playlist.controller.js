import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "All fields are required");
  }

  const existingPlaylist = await Playlist.findOne({
    name,
    owner: req.user._id,
  });
  let playlist;
  if (existingPlaylist) {
    throw new ApiError(400, "A playlist with the same name already exists");
  } else {
    playlist = await Playlist.create({
      name,
      description,
      owner: req.user._id,
    });
    if (!playlist) {
      throw new ApiError(500, "Failed to create playlist");
    }
  }
  res
    .status(200)
    .json(new ApiResponse(201, playlist, "Playlist Created Successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  await Playlist.findByIdAndDelete(playlistId);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist Deleted Successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Ids");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to add video to this playlist");
  }

  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in this playlist");
  }

  playlist.videos.push(videoId);
  await playlist.save();

  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added in playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Ids");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to remove video from this playlist");
  }

  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video not found in this playlist");
  }

  playlist.videos.pull(videoId);
  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video removed from playlist"));
});

const getUserPlaylist = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }
  const userExists = await User.findById(userId);
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  const existedPlaylists = await Playlist.find({ owner: userId });
  const formattedPlaylist = existedPlaylists.map((playlist) => {
    return {
      _id: playlist._id,
      name: playlist.name,
      description: playlist.description,
      createdAt: playlist.createdAt,
    };
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, formattedPlaylist, "Playlist fetched successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid Id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "playlistOwner",
      },
    },
    {
      $unwind: "$playlistOwner",
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
        $unwind: "$videoDetails"
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        createdAt: 1,
        owner: {
          _id: "$playlistOwner._id",
          username: "$playlistOwner.username",
          fullName: "$playlistOwner.fullName",
          avatar: "$playlistOwner.avatar",
        },
        videos: {
          _id: "$videoDetails._id",
          title: "$videoDetails.title",
          description: "$videoDetails.description",
          thumbnail: "$videoDetails.thumbnail",
          views: "$videoDetails.views",
          duration: "$videoDetails.duration",
        },
        videosCount: {
          $size: "$videos",
        },
      },
    },
  ]);

  if (playlist.length === 0) {
    throw new ApiError(404, "Playlist not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched by id"));
});

export {
  createPlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  getUserPlaylist,
  updatePlaylist,
  getPlaylistById,
};
