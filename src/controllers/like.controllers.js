import mongoose, {isValidObjectId} from "mongoose"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const userId = req.user?._id
    const existingLike = await Like.findOne({
        $and: [
            { video: videoId },
            { likedBy: userId }
        ]
    })

    if(existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id})
        return res.status(200).json(new ApiResponse(200, "Like video removed successfully", {}))
    }

    const like = await Like.create({
        video: videoId,
        likedBy: userId
    })

    if(!like) {
        throw new ApiError(500, "Failed to create like on video")
    }

    return res
        .status(201)
        .json( new ApiResponse(
          201,
          like,
          "Like video successfully"
        ))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const userID = req.user?._id

    const existingLike = await Like.findOne({
        $and: [
            { comment: commentId },
            { likedBy: userID }
        ]
    })

    if(existingLike) {
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse(200, "Like comment removed successfully", {}))
    }

    const like = await Like.create({
        comment: commentId,
        likedBy: userID
    })

    if(!like) {
        throw new ApiError(500, "Failed to create like on comment")
    }

    return res
        .status(201)
        .json(new ApiResponse(
            201,
            like,
            "Like comment successfully"
        ))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if(!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    const userId = req.user?._id
    const existingLike = await Like.findOne({
        $and: [
            { tweet: tweetId },
            { likedBy: userId }
        ]
    })

    if(existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse(200, "Like tweet removed successfully", {}))
    }

    const like = await Like.create({
        tweet: tweetId,
        likedBy: userId
    })

    if(!like) {
        throw new ApiError(500, "Failed to create like on tweet")
    }

    return res
        .status(201)
        .json(new ApiResponse(
            201,
            like,
            "Like tweet successfully"
        ))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id
    if(!userId) {
        throw new ApiError(401, "User not found")
    }
    // const likedVideos = await Like.aggregate([
    //   {
    //     $match: {
    //       likedBy: new mongoose.Types.ObjectId(userId),
    //       video: { $exists: true }
    //     }
    //   },
    //   {
    //     $lookup: {
    //       from: "videos",
    //       localField: "video",
    //       foreignField: "_id",
    //       as: "videoDetails"
    //     }
    //   },
    //   {
    //     $unwind: "$videoDetails"
    //   },
    //   {
    //     $project: {
    //       _id: 0,
    //       videoId: "$videoDetails._id",
    //       title: "$videoDetails.title",
    //       thumbnail: "$videoDetails.thumbnail",
    //       owner: "$videoDetails.owner",
    //     }
    //   }
    // ])

    const likedVideos = await Like.find({ likedBy: userId, video: { $exists: true } })
        .populate("video", "title thumbnail owner")
        .select("video")
    
    if(!likedVideos || likedVideos.length === 0) {
        return res.status(404).json(new ApiResponse(404, [], "No liked videos found"))
    }

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}