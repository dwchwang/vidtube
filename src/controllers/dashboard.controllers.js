import mongoose from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.models.js"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user?._id;
  
  if (!userId) {
      throw new ApiError(400, "User ID is required");
  }

  try {
      const channelStats = {};

      // Total Videos
      const totalVideos = await Video.countDocuments({ owner: userId });
      channelStats.totalVideos = totalVideos;

      // Total Subscribers
      const totalSubscribers = await Subscription.countDocuments({ channel: userId });
      channelStats.totalSubscribers = totalSubscribers;

      // Total Views
      const totalViews = await Video.aggregate([
          {
              $match: {
                  owner: new mongoose.Types.ObjectId(userId) 
              }
          },
          {
              $group: {
                  _id: null,
                  totalViews: { $sum: "$views" }
              }
          }
      ]);
      channelStats.totalViews = totalViews.length > 0 ? totalViews[0].totalViews : 0;

      // Total likes
      const totalLikes = await Video.aggregate([
          {
              $match: {
                  owner: new mongoose.Types.ObjectId(userId)
              }
          },
          {
              $lookup: {
                  from: "likes",
                  localField: "_id",
                  foreignField: "video",
                  as: "videoLikes"
              }
          },
          {
              $project: {
                  likesCount: { $size: "$videoLikes" }
              }
          },
          {
              $group: {
                  _id: null,
                  totalLikes: { $sum: "$likesCount" }
              }
          }
      ]);
      channelStats.totalLikes = totalLikes.length > 0 ? totalLikes[0].totalLikes : 0;

      // Total Comments
      const totalCommentsResult = await Video.aggregate([
          {
              $match: {
                  owner: new mongoose.Types.ObjectId(userId)
              }
          },
          {
              $lookup: {
                  from: "comments",
                  localField: "_id",
                  foreignField: "video",
                  as: "videoComments"
              }
          },
          {
              $project: {
                  commentsCount: { $size: "$videoComments" }
              }
          },
          {
              $group: {
                  _id: null,
                  totalComments: { $sum: "$commentsCount" }
              }
          }
      ]);
      channelStats.totalComments = totalCommentsResult.length > 0 ? totalCommentsResult[0].totalComments : 0;

      return res.status(200).json(
          new ApiResponse(200, channelStats, "Channel stats fetched successfully") // Đổi thứ tự tham số
      );
  } catch (error) {
      console.error("Error fetching channel stats:", error);
      throw new ApiError(500, "Internal Server Error");
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user?._id
  if(!userId) {
    throw new ApiError(400, "User ID is required")
  }
  try {
    const videos = await Video.find({ owner: userId })
      .sort({ createdAt: -1 }) // Sort by creation date, most recent first
      .populate("owner", "username fullname avatar") // Populate owner details

    return res.status(200).json(
      new ApiResponse(200, videos,"Channel videos fetched successfully")
    )
  } catch (error) {
    console.error("Error fetching channel videos:", error)
    throw new ApiError(500, "Internal Server Error")
  }
})

export {
  getChannelStats, 
  getChannelVideos
  }