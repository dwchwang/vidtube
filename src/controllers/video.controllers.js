import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
  
  // TODO: get all videos based on query, sort, pagination
  
  const pipeline = []
  
  // Nếu có userId, filter theo owner
  if (userId && isValidObjectId(userId)) {
      pipeline.push({
          $match: {
              owner: new mongoose.Types.ObjectId(userId) 
          }
      });
  }
  
  // Nếu có query, tìm kiếm theo title
  if (query) {
      pipeline.push({
          $match: {
              title: { $regex: query, $options: "i" }, // tìm kiếm không phân biệt hoa thường
          },
      });
  }
  
  pipeline.push(
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
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              duration: 1,
              views: 1,
              isPublished: 1,
              createdAt: 1,
              owner: {
                  _id: 1,
                  fullname: 1,
                  username: 1,
              },
          },
      },
      {
          $sort: {
              [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1,
          },
      }
  );
  
  const fetchedVideos = await Video.aggregatePaginate(Video.aggregate(pipeline), {
      page: parseInt(page),
      limit: parseInt(limit),
  });
  
  return res
      .status(200)
      .json(new ApiResponse(200, fetchedVideos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    const user = await User.findById(req.user?._id)
    if(!user) {
        throw new ApiError(404, "User not found")
    }
    // TODO: get video, upload to cloudinary, create video
    const videoFileURL = req.files?.videoFile?.[0]?.path
    const thumbnailURL = req.files?.thumbnail?.[0]?.path

    if(!videoFileURL) {
        throw new ApiError(400, "Video file is required")
    }

    if(!thumbnailURL) {
      throw new ApiError(400, "Thumbnail is required")
    }

    let videoFile, thumbnail
    try {
      videoFile = await uploadOnCloudinary(videoFileURL)
      console.log("Video file uploaded successfully:", videoFile)

      thumbnail = await uploadOnCloudinary(thumbnailURL)
      console.log("Thumbnail uploaded successfully:", thumbnail)

    } catch (error) {
      console.log("Error uploading video file:", error)
      throw new ApiError(500, "Failed to upload video")
    }

    const duration_video = videoFile.duration.toFixed(0)
    try {
      const video = await Video.create({
        owner: user._id,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: duration_video, // TODO: calculate duration from video file
      })

      if(!video) {
        throw new ApiError(500, "Failed to create video")
      }

      await video.save()

      return res
          .status(201)
          .json(new ApiResponse(201,video , "Video created successfully"))

    } catch (error) {
      console.log("Error creating video:", error)
      if(videoFile) {
        await deleteFromCloudinary(videoFile.public_id)
      }
      if(thumbnail) {
        await deleteFromCloudinary(thumbnail.public_id)
      }
      throw new ApiError(500," Something went wrong while creating video")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId).populate("owner", "fullname username")
    if(!video) {
        throw new ApiError(404, "Video not found")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body
    if(!title.trim() || !description.trim()) {
        throw new ApiError(400, "Title and description are required")
    }
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const currentVideo = await Video.findById(videoId)
    if(!currentVideo) {
      throw new ApiError(404, "Video not found")
    }
    
    if (currentVideo.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You are not authorized to update this video")
    }

    const thumbnailFileURL = req.file?.path

    if(!thumbnailFileURL) {
        throw new ApiError(400, "Thumbnail is required")
    }
    
    let newThumbnail
    try {
        newThumbnail = await uploadOnCloudinary(thumbnailFileURL)
        console.log("Thumbnail uploaded successfully:", newThumbnail)

    } catch (error) {
        console.log("Error uploading thumbnail:", error)
        throw new ApiError(500, "Failed to upload thumbnail")
    }

    const videoUpdated = await Video.findByIdAndUpdate(
      videoId,
      {
        title,
        description,
        thumbnail: newThumbnail.url
      },
      {new: true}
    ).select("title description thumbnail")

    if(!videoUpdated) {
        throw new ApiError(404, "Video not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videoUpdated, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const videoOwner = await Video.findById(videoId).select("owner")
    if(videoOwner.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video")
    }

    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const videoDeleted = await Video.findByIdAndDelete(videoId)

    if(!videoDeleted) {
        throw new ApiError(404, "Video not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Video deleted successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  if(!videoId || !isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video ID")
  }

  const video = await Video.findById(videoId)
  if (!video) {
    throw new ApiError(404, " video not found")
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this video");
  }

  video.isPublished = !video.isPublished;

  await video.save();

  const publishStatus = {
    _id: video._id,
    owner: video.owner,
    title: video.title,
    description: video.description,
    isPublished: video.isPublished
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, publishStatus,"Video publish status toggled succesfully...")
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}